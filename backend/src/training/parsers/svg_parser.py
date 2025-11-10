"""
SVG annotation parser for CubiCasa5k dataset.
Extracts room polygons and metadata from SVG floor plan annotations.
"""

import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Tuple, Optional
from pathlib import Path
import re


class SVGParser:
    """
    Parse SVG floor plan annotations and extract room information.
    """

    # Room type mapping: SVG class -> Simplified category
    ROOM_TYPE_MAPPING = {
        # Bedrooms
        'Bedroom': 'Bedroom',
        'DressingRoom': 'Bedroom',

        # Living areas
        'LivingRoom': 'LivingRoom',

        # Kitchen
        'Kitchen': 'Kitchen',

        # Bathrooms
        'Bath': 'Bathroom',
        'Bath Shower': 'Bathroom',

        # Dining
        'Dining': 'Dining',

        # Entry/Lobby
        'Entry Lobby': 'Entry',
        'Entry': 'Entry',
        'DraughtLobby': 'Entry',

        # Storage/Closets
        'Closet WalkIn': 'Closet',
        'Closet': 'Closet',
        'Storage': 'Closet',

        # Utility rooms
        'Utility Laundry': 'Utility',
        'Utility': 'Utility',
        'TechnicalRoom': 'Utility',

        # Outdoor spaces
        'Outdoor': 'Outdoor',
        'Outdoor Balcony': 'Outdoor',
        'Outdoor Terrace': 'Outdoor',
        'Outdoor Garden': 'Outdoor',

        # Other/Undefined
        'Undefined': 'Other',
        'UserDefined': 'Other',
        'Garage': 'Other',
        'Sauna': 'Other',
    }

    # YOLO class IDs
    CLASS_TO_ID = {
        'Bedroom': 0,
        'LivingRoom': 1,
        'Kitchen': 2,
        'Bathroom': 3,
        'Dining': 4,
        'Entry': 5,
        'Closet': 6,
        'Utility': 7,
        'Outdoor': 8,
        'Other': 9,
    }

    def __init__(self):
        """Initialize the SVG parser."""
        self.namespace = {'svg': 'http://www.w3.org/2000/svg'}

    def parse_svg_file(self, svg_path: Path) -> Dict[str, Any]:
        """
        Parse an SVG file and extract all room annotations.

        Args:
            svg_path: Path to the SVG file

        Returns:
            Dictionary containing image metadata and room annotations
        """
        tree = ET.parse(svg_path)
        root = tree.getroot()

        # Extract image dimensions from SVG viewBox or width/height
        viewbox = root.get('viewBox')
        if viewbox:
            _, _, width, height = map(float, viewbox.split())
        else:
            width = float(root.get('width', 0))
            height = float(root.get('height', 0))

        # Extract rooms from SVG
        rooms = self._extract_rooms(root)

        return {
            'image_id': svg_path.parent.name,
            'svg_width': width,
            'svg_height': height,
            'rooms': rooms,
            'num_rooms': len(rooms)
        }

    def _extract_rooms(self, root: ET.Element) -> List[Dict[str, Any]]:
        """
        Extract room polygons from SVG root element.

        Args:
            root: SVG root element

        Returns:
            List of room dictionaries with polygons and metadata
        """
        rooms = []

        # Find all elements with class attribute containing "Space"
        # Need to check both with and without namespace
        for elem in root.iter():
            class_attr = elem.get('class', '')

            # Check if this is a Space element (room)
            # Must have "Space" and not be "Wall" or other non-room elements
            if 'Space' in class_attr and 'Wall' not in class_attr:
                room_data = self._parse_room_element(elem)
                if room_data:
                    rooms.append(room_data)

        return rooms

    def _parse_room_element(self, elem: ET.Element) -> Optional[Dict[str, Any]]:
        """
        Parse a single room element and extract polygon and metadata.

        Args:
            elem: SVG <g> element representing a room

        Returns:
            Dictionary with room data or None if invalid
        """
        class_attr = elem.get('class', '')
        room_id = elem.get('id', 'unknown')

        # Extract room type from class attribute
        # Format: "Space RoomType SubType" or "Space RoomType"
        room_type_raw = self._extract_room_type(class_attr)
        if not room_type_raw:
            return None

        # Map to simplified category
        room_type = self.ROOM_TYPE_MAPPING.get(room_type_raw, 'Other')
        class_id = self.CLASS_TO_ID.get(room_type, 9)  # Default to "Other"

        # Find polygon element (search children, not descendants)
        polygon = None
        for child in elem:
            if child.tag.endswith('polygon') or child.tag == 'polygon':
                polygon = child
                break

        if polygon is None:
            return None

        # Parse polygon points
        points_str = polygon.get('points', '')
        polygon_points = self._parse_polygon_points(points_str)
        if not polygon_points or len(polygon_points) < 3:
            return None

        # Calculate bounding box from polygon
        bbox = self._polygon_to_bbox(polygon_points)

        # Validate bbox
        if bbox[2] <= bbox[0] or bbox[3] <= bbox[1]:
            return None

        # Extract room label (e.g., "MH", "K", "VH")
        room_label = self._extract_room_label(elem)

        return {
            'id': room_id,
            'type': room_type,
            'type_raw': room_type_raw,
            'class_id': class_id,
            'label': room_label,
            'polygon': polygon_points,
            'bbox': bbox,
        }

    def _extract_room_type(self, class_attr: str) -> Optional[str]:
        """
        Extract room type from class attribute.

        Args:
            class_attr: Class attribute string (e.g., "Space Bedroom")

        Returns:
            Room type string or None
        """
        # Parse class attribute: "Space RoomType SubType" -> "RoomType SubType"
        match = re.search(r'Space\s+(.+?)(?:\s+v\d|$)', class_attr)
        if match:
            room_type = match.group(1).strip()
            # Handle "Model v1-1" suffix
            room_type = re.sub(r'\s+v\d.*$', '', room_type)
            return room_type
        return None

    def _parse_polygon_points(self, points_str: str) -> List[Tuple[float, float]]:
        """
        Parse polygon points string into list of (x, y) tuples.

        Args:
            points_str: Points string (e.g., "100,200 300,400 500,600")

        Returns:
            List of (x, y) coordinate tuples
        """
        points = []
        # Split by whitespace and parse x,y pairs
        coords = points_str.strip().split()
        for coord in coords:
            try:
                x, y = map(float, coord.split(','))
                points.append((x, y))
            except (ValueError, IndexError):
                continue
        return points

    def _polygon_to_bbox(self, polygon: List[Tuple[float, float]]) -> List[float]:
        """
        Convert polygon to bounding box [x_min, y_min, x_max, y_max].

        Args:
            polygon: List of (x, y) coordinate tuples

        Returns:
            Bounding box as [x_min, y_min, x_max, y_max]
        """
        if not polygon:
            return [0, 0, 0, 0]

        x_coords = [p[0] for p in polygon]
        y_coords = [p[1] for p in polygon]

        return [
            min(x_coords),
            min(y_coords),
            max(x_coords),
            max(y_coords)
        ]

    def _extract_room_label(self, elem: ET.Element) -> Optional[str]:
        """
        Extract room label text (e.g., "MH", "K", "VH").

        Args:
            elem: Room element

        Returns:
            Room label string or None
        """
        # Look for text element in SpaceDimensionsLabel
        for text_elem in elem.iter('text'):
            text = text_elem.text
            if text and text.strip():
                return text.strip()
        return None


def main():
    """Test the SVG parser on a sample file."""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python svg_parser.py <svg_file>")
        sys.exit(1)

    svg_path = Path(sys.argv[1])
    if not svg_path.exists():
        print(f"Error: File not found: {svg_path}")
        sys.exit(1)

    parser = SVGParser()
    result = parser.parse_svg_file(svg_path)

    print(f"\n{'='*60}")
    print(f"SVG Parser Test Results")
    print(f"{'='*60}")
    print(f"Image ID: {result['image_id']}")
    print(f"Dimensions: {result['svg_width']}x{result['svg_height']}")
    print(f"Number of rooms: {result['num_rooms']}")
    print(f"\n{'='*60}")
    print("Rooms:")
    print(f"{'='*60}")

    for i, room in enumerate(result['rooms'], 1):
        print(f"\n{i}. {room['type']} (class_id={room['class_id']})")
        print(f"   ID: {room['id']}")
        print(f"   Raw type: {room['type_raw']}")
        print(f"   Label: {room['label']}")
        print(f"   BBox: {room['bbox']}")
        print(f"   Polygon vertices: {len(room['polygon'])}")


if __name__ == '__main__':
    main()
