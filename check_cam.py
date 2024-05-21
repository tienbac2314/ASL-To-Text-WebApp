import cv2

def find_camera_index():
    index = 0
    while True:
        cap = cv2.VideoCapture(index)
        if not cap.read()[0]:
            break
        else:
            print(f"Camera index {index} opened successfully")
            cap.release()
        index += 1
    return index - 1

print(find_camera_index())