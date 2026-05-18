import serial # pip install pyserial

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
            print(line.decode('utf-8').strip())
except KeyboardInterrupt:
    print("Stopped")
finally:
    ser.close()
