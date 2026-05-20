import serial # pip install pyserial
import json

def decode_sensor_data(raw_line):
    """
    Decode a JSON string containing sensor data from Arduino.

    Expected format:
    {timestamp: 128389, flexi1: [0,1], flexi2: [0,1], flexi3: [0,1], gps: [{lat: 12.3, lon: 45.2}], accel: [12.2, 9.3]}

    Returns:
        dict: Parsed sensor data, or None if parsing fails
    """
    try:
        # Handle JavaScript-style object notation (without quotes around keys)
        # Replace unquoted keys with quoted keys
        formatted_line = raw_line

        # Try to parse as standard JSON first
        data = json.loads(formatted_line)
        return data
    except json.JSONDecodeError:
        try:
            # If standard JSON fails, try to convert JavaScript-style object to JSON
            # This regex approach handles common cases
            import re

            # Replace unquoted keys with quoted keys
            # Matches patterns like "key:" and replaces with "key":"
            formatted_line = re.sub(r'(\w+):', r'"\1":', formatted_line)

            # Remove any trailing commas before closing braces/brackets
            formatted_line = re.sub(r',(\s*[}\]])', r'\1', formatted_line)

            data = json.loads(formatted_line)
            return data
        except Exception as e:
            print(f"Error decoding data: {e}")
            print(f"Raw input: {raw_line}")
            return None

def display_sensor_data(data):
    """Pretty print the decoded sensor data."""
    if data is None:
        return

    print("\n--- Sensor Data ---")
    print(f"Timestamp: {data.get('timestamp', 'N/A')}")

    if 'flexi1' in data:
        print(f"Flexi 1: {data['flexi1']}")
    if 'flexi2' in data:
        print(f"Flexi 2: {data['flexi2']}")
    if 'flexi3' in data:
        print(f"Flexi 3: {data['flexi3']}")

    if 'gps' in data:
        print(f"GPS Data: {data['gps']}")

    if 'accel' in data:
        print(f"Acceleration: {data['accel']}")

    print("-------------------\n")

# Open COM6
ser = serial.Serial(
    port='COM6',
    baudrate=9600,        # Match your device's baud rate
    bytesize=serial.EIGHTBITS,
    parity=serial.PARITY_NONE,
    stopbits=serial.STOPBITS_ONE,
    timeout=1             # Read timeout in seconds
)

print(f"Connected to {ser.name}")

try:
    while True:
        if ser.in_waiting > 0:          # Bytes available to read
            line = ser.readline()        # Read until newline
            decoded_line = line.decode('utf-8').strip()

            # Decode and display sensor data
            sensor_data = decode_sensor_data(decoded_line)
            if sensor_data:
                display_sensor_data(sensor_data)
            else:
                print(f"Raw (unparsed): {decoded_line}")
except KeyboardInterrupt:
    print("Stopped")
finally:
    ser.close()
