function decodeUplink(input) {
  var bytes = input.bytes;
  var i = 0;

  // Lecture d'un int16_t signé little-endian (2 octets)
  function readInt16() {
    var val = bytes[i] | (bytes[i + 1] << 8);
    if (val >= 0x8000) val -= 0x10000;  // correction du signe
    i += 2;
    return val;
  }

  // Lecture d'un tableau de n int16_t
  function readInt16Array(n) {
    var arr = [];
    for (var j = 0; j < n; j++) {
      arr.push(readInt16());
    }
    return arr;
  }

  return {
    data: {
      flexiforce1: readInt16Array(20),  // octets 0–39
      flexiforce2: readInt16Array(20),  // octets 40–79
      flexiforce3: readInt16Array(20),  // octets 80–119
    }
  };
}