// Canvas utility functions for blueprint visualization
import type { Room, Point } from '../types/api';

export interface CanvasConfig {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Calculate optimal canvas size to fit image within container
 */
export function calculateCanvasSize(
  imageWidth: number,
  imageHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number; scale: number } {
  const scaleX = maxWidth / imageWidth;
  const scaleY = maxHeight / imageHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Don't scale up

  return {
    width: imageWidth * scale,
    height: imageHeight * scale,
    scale,
  };
}

/**
 * Convert Point array to Konva-compatible flat number array
 * [[x1, y1], [x2, y2]] => [x1, y1, x2, y2]
 */
export function pointsToKonvaPoints(points: Point[]): number[] {
  return points.flatMap((point) => point);
}

/**
 * Generate color for room visualization based on index
 */
export function generateRoomColor(index: number): string {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Light Salmon
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2', // Sky Blue
    '#F8B88B', // Peach
    '#A2D9CE', // Aqua
  ];
  return colors[index % colors.length];
}

/**
 * Calculate center point of a polygon
 */
export function calculateRoomCenter(polygon: Point[]): Point {
  const sumX = polygon.reduce((sum, [x]) => sum + x, 0);
  const sumY = polygon.reduce((sum, [, y]) => sum + y, 0);
  return [sumX / polygon.length, sumY / polygon.length];
}

/**
 * Calculate center point of a bounding box
 */
export function calculateBoundingBoxCenter(bbox: [number, number, number, number]): Point {
  const [x1, y1, x2, y2] = bbox;
  return [(x1 + x2) / 2, (y1 + y2) / 2];
}

/**
 * Calculate area of a bounding box
 */
export function calculateBoundingBoxArea(bbox: [number, number, number, number]): number {
  const [x1, y1, x2, y2] = bbox;
  return (x2 - x1) * (y2 - y1);
}

/**
 * Calculate perimeter of a bounding box
 */
export function calculateBoundingBoxPerimeter(bbox: [number, number, number, number]): number {
  const [x1, y1, x2, y2] = bbox;
  return 2 * ((x2 - x1) + (y2 - y1));
}

/**
 * Format area for display
 */
export function formatArea(area: number): string {
  return `${area.toFixed(0)} px²`;
}

/**
 * Format perimeter for display
 */
export function formatPerimeter(perimeter: number): string {
  return `${perimeter.toFixed(0)} px`;
}

/**
 * Scale point coordinates by a factor
 */
export function scalePoint(point: Point, scale: number): Point {
  return [point[0] * scale, point[1] * scale];
}

/**
 * Scale all points in a polygon
 */
export function scalePolygon(polygon: Point[], scale: number): Point[] {
  return polygon.map((point) => scalePoint(point, scale));
}
