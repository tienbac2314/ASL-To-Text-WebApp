from flask import Flask, render_template, Response, jsonify, request, send_from_directory, abort
import cv2
import mediapipe as mp
import pickle
import numpy as np
import time
import threading   

app = Flask(__name__, static_folder='static')

@app.route('/webSignDetect/alphabet/<path:filename>')
def custom_static(filename):
    return send_from_directory('alphabet', filename)


mp_drawing = mp.solutions.drawing_utils
mp_hand = mp.solutions.hands
mp_drawing_styles = mp.solutions.drawing_styles

hands = mp_hand.Hands(
    model_complexity=0,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

camera = None
is_camera_on = False
camera_lock = threading.Lock()
predicted_history = ""
data_aux = []
x_ = []
y_ = []
model_dict = pickle.load(open('./model.p', 'rb'))
model = model_dict['model']
labels_dict = {
    0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G', 7: 'H', 8: 'I', 9: 'J',
    10: 'K', 11: 'L', 12: 'M', 13: 'N', 14: 'O', 15: 'P', 16: 'Q', 17: 'R', 18: 'S',
    19: 'T', 20: 'U', 21: 'V', 22: 'W', 23: 'X', 24: 'Y',
    25: 'A', 26: 'B', 27: 'C', 28: 'D', 29: 'E', 30: 'F', 31: 'G', 32: 'H', 33: 'I', 34: 'J',
    35: 'K', 36: 'L', 37: 'M', 38: 'N', 39: 'O', 40: 'P', 41: 'Q', 42: 'R', 43: 'S',
    44: 'T', 45: 'U', 46: 'V', 47: 'W', 48: 'X', 49: 'Y'
}
predicted_word = ""
allow_prediction = True

def process_hands(img):
    global data_aux, x_, y_, predicted_history, predicted_word, allow_prediction
    
    data_aux = []
    x_ = []
    y_ = []
    
    H, W, _ = img.shape
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    result = hands.process(img_rgb)

    if result.multi_hand_landmarks:
        for hand_landmarks in result.multi_hand_landmarks:
            # mp_drawing.draw_landmarks(
            #     img,  # image to draw
            #     hand_landmarks,  # model output
            #     mp_hand.HAND_CONNECTIONS,  # hand connections
            #     mp_drawing_styles.get_default_hand_landmarks_style(),
            #     mp_drawing_styles.get_default_hand_connections_style()
            # )

            for i in range(len(hand_landmarks.landmark)):
                x = hand_landmarks.landmark[i].x
                y = hand_landmarks.landmark[i].y
                x_.append(x)
                y_.append(y)

            min_x, min_y = min(x_), min(y_)

            for i in range(len(hand_landmarks.landmark)):
                x = hand_landmarks.landmark[i].x
                y = hand_landmarks.landmark[i].y
                data_aux.append(x - min_x)
                data_aux.append(y - min_y)

        expected_features = 84
        if len(data_aux) < expected_features:
            # Pad with zeros if data_aux is shorter
            data_aux += [0] * (expected_features - len(data_aux))
        elif len(data_aux) > expected_features:
            # Trim if data_aux is longer
            data_aux = data_aux[:expected_features]

        x1 = int(min(x_) * W) - 10
        y1 = int(min(y_) * H) - 10
        x2 = int(max(x_) * W) + 10
        y2 = int(max(y_) * H) + 10

        prediction = model.predict([np.asarray(data_aux)])
        predicted_character = labels_dict[int(prediction[0])]

        if allow_prediction:
            predicted_history += predicted_character

        # If the last 12 characters of predicted_history are the same
        if len(predicted_history) >= 24 and len(set(predicted_history[-24:])) == 1:
            # Add that character to predicted_word and clear predicted_history
            predicted_word += predicted_character
            predicted_history = ""

            # Start a new thread that will set allow_prediction to True after 1 second
            threading.Thread(target=delayed_prediction_reset).start()

        # cv2.rectangle(img, (x1, y1), (x2, y2), (0, 0, 0), 4)
        cv2.putText(img, predicted_character, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 1.3, (0, 255, 255), 4, cv2.LINE_AA)

    # Display the full history of predictions on the frame
    cv2.putText(img, predicted_word, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2, cv2.LINE_AA)

    return img

def delayed_prediction_reset():
    global allow_prediction

    # Wait for 1 second
    time.sleep(1)

    # Allow adding to predicted_history
    allow_prediction = True

def generate_frames():
    global camera, predicted_history, camera_lock
    while is_camera_on:
        with camera_lock:
            success, img = camera.read()
        if not success:
            break
        else:
            img = process_hands(img)
            img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            ret, buffer = cv2.imencode('.jpg', img)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/')
def index():
    return render_template('index.html', predicted_word = predicted_word)

@app.route('/video_feed')
def video_feed():
    global camera
    if camera is None:
        return "Camera is not on", 404
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/get_predicted_word', methods=['GET'])
def get_predicted_word():
    global predicted_word
    return jsonify(predicted_word=predicted_word)

@app.route('/toggle_camera', methods=['POST'])
def toggle_camera():
    global camera, is_camera_on, predicted_history, predicted_word, camera_lock
    with camera_lock:
        if is_camera_on:
            camera.release()
            camera = None
            is_camera_on = False
            predicted_history = ""
            predicted_word = ""  # Reset predicted_word
        else:
            if camera is not None:
                camera.release()
                camera = None
            camera = cv2.VideoCapture(0)
            if not camera.isOpened():
                abort(500, "Could not open video source")
            is_camera_on = True
    return jsonify(is_camera_on=is_camera_on)

if __name__ == '__main__':
    app.run(debug=True)
