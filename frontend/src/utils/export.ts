// Export utility functions for room data
import type { Room } from '../types/api';

/**
 * Export rooms data as JSON file
 */
export function exportRoomsAsJSON(rooms: Room[], jobId: string): void {
  const data = {
    jobId,
    exportDate: new Date().toISOString(),
    roomCount: rooms.length,
    rooms,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `location-detection-${jobId}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Export rooms data as CSV file
 */
export function exportRoomsAsCSV(rooms: Room[]): void {
  const headers = ['ID', 'Area (px²)', 'Perimeter (px)', 'Vertices', 'Name Hint'];

  const rows = rooms.map((room) => [
    room.id,
    room.area.toFixed(2),
    room.perimeter.toFixed(2),
    room.polygon.length,
    room.name_hint || '',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rooms-export.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Copy room data to clipboard as JSON
 */
export async function copyRoomsToClipboard(rooms: Room[]): Promise<void> {
  const data = {
    exportDate: new Date().toISOString(),
    roomCount: rooms.length,
    rooms,
  };

  await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
}
