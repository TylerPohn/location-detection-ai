// Blueprint canvas visualization with Konva
import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Text, Circle, Group } from 'react-konva';
import { Paper } from '@mui/material';
import type { Room } from '../../types/api';
import {
  calculateCanvasSize,
  generateRoomColor,
  calculateRoomCenter,
} from '../../utils/canvas';

interface BlueprintCanvasProps {
  imageUrl: string;
  rooms: Room[];
  onRoomSelect?: (room: Room | null) => void;
  selectedRoomId?: string | null;
}

export function BlueprintCanvas({
  imageUrl,
  rooms,
  onRoomSelect,
  selectedRoomId,
}: BlueprintCanvasProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600, scale: 1 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);

      // Calculate canvas size based on container
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = window.innerHeight * 0.7; // 70vh

        const dims = calculateCanvasSize(
          img.width,
          img.height,
          containerWidth - 32, // Account for padding
          containerHeight
        );

        setDimensions(dims);
      }
    };
  }, [imageUrl]);

  const handleRoomClick = (room: Room) => {
    if (onRoomSelect) {
      onRoomSelect(selectedRoomId === room.id ? null : room);
    }
  };

  // Convert room polygon points to Konva points array [x1, y1, x2, y2, ...]
  const pointsToKonvaPoints = (points: [number, number][]): number[] => {
    return points.flatMap(point => [
      point[0] * dimensions.scale,
      point[1] * dimensions.scale
    ]);
  };

  return (
    <Paper ref={containerRef} sx={{ p: 2, overflow: 'auto', position: 'relative' }}>
      <Stage width={dimensions.width} height={dimensions.height}>
        <Layer>
          {/* Blueprint image */}
          {image && (
            <KonvaImage
              image={image}
              width={dimensions.width}
              height={dimensions.height}
            />
          )}

          {/* Room boundaries */}
          {rooms.map((room, index) => {
            const color = generateRoomColor(index);
            const isSelected = selectedRoomId === room.id;
            const points = pointsToKonvaPoints(room.polygon);
            const center = calculateRoomCenter(room.polygon);
            const centerX = center[0] * dimensions.scale;
            const centerY = center[1] * dimensions.scale;

            return (
              <Group key={room.id}>
                {/* Polygon fill and stroke */}
                <Line
                  points={points}
                  closed
                  fill={color}
                  opacity={isSelected ? 0.4 : 0.2}
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 2}
                  onClick={() => handleRoomClick(room)}
                  onTap={() => handleRoomClick(room)}
                  style={{ cursor: 'pointer' }}
                />

                {/* Room label background */}
                <Circle
                  x={centerX}
                  y={centerY}
                  radius={20}
                  fill="rgba(0, 0, 0, 0.7)"
                  onClick={() => handleRoomClick(room)}
                  onTap={() => handleRoomClick(room)}
                />

                {/* Room ID text */}
                <Text
                  x={centerX}
                  y={centerY}
                  text={room.id.replace('room_', '').replace('room-', '')}
                  fontSize={14}
                  fontStyle="bold"
                  fill="white"
                  align="center"
                  verticalAlign="middle"
                  offsetX={10} // Center text horizontally
                  offsetY={7}  // Center text vertically
                  onClick={() => handleRoomClick(room)}
                  onTap={() => handleRoomClick(room)}
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </Paper>
  );
}
