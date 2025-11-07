"""Create sample blueprint for testing."""
import cv2
import numpy as np

# Create a sample blueprint with multiple rooms
image = np.ones((800, 1000, 3), dtype=np.uint8) * 255

# Living room (large)
cv2.rectangle(image, (50, 50), (450, 400), (0, 0, 0), 3)

# Kitchen (rectangular)
cv2.rectangle(image, (500, 50), (950, 300), (0, 0, 0), 3)

# Bedroom 1 (square)
cv2.rectangle(image, (500, 350), (700, 550), (0, 0, 0), 3)

# Bedroom 2 (rectangular)
cv2.rectangle(image, (750, 350), (950, 550), (0, 0, 0), 3)

# Bathroom (small)
cv2.rectangle(image, (50, 450), (250, 600), (0, 0, 0), 3)

# Hallway (L-shaped)
points = np.array([
    [300, 450],
    [650, 450],
    [650, 550],
    [500, 550],
    [500, 750],
    [300, 750]
], dtype=np.int32)
cv2.polylines(image, [points], True, (0, 0, 0), 3)

# Add some doors (gaps in walls)
cv2.line(image, (250, 50), (300, 50), (255, 255, 255), 4)
cv2.line(image, (500, 200), (500, 250), (255, 255, 255), 4)

# Add labels
cv2.putText(image, "LIVING ROOM", (150, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (100, 100, 100), 2)
cv2.putText(image, "KITCHEN", (620, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (100, 100, 100), 2)
cv2.putText(image, "BR1", (570, 450), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (100, 100, 100), 2)
cv2.putText(image, "BR2", (820, 450), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (100, 100, 100), 2)
cv2.putText(image, "BATH", (100, 530), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 100), 2)

# Save
cv2.imwrite('sample_blueprint.png', image)
print("Sample blueprint created: sample_blueprint.png")
