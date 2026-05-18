function decodeUplink(input) {
  var bytes = input.bytes;
  var offset = 0;

  // --- Fonctions utilitaires ---
  function readUint32() {
    var val = (bytes[offset] |
              (bytes[offset+1] << 8) |
              (bytes[offset+2] << 16) |
              (bytes[offset+3] << 24)) >>> 0;
    offset += 4;
    return val;
  }

  function readInt32() {
    var val = bytes[offset] |
              (bytes[offset+1] << 8) |
              (bytes[offset+2] << 16) |
              (bytes[offset+3] << 24);
    offset += 4;
    return val;
  }

  function readUint16() {
    var val = bytes[offset] | (bytes[offset+1] << 8);
    offset += 2;
    return val;
  }

  function readBits(nb_octets, nb_bits) {
    var result = [];
    for (var i = 0; i < nb_bits; i++) {
      var octet = Math.floor(i / 8);
      var bit   = i % 8;
      result.push((bytes[offset + octet] >> bit) & 1);
    }
    offset += nb_octets;
    return result;
  }

  // --- Décodage ---

  // Timestamp (4 octets)
  var timestamp = readUint32();

  // GPS latitudes (6 × 4 octets)
  var gps = [];
  for (var i = 0; i < 6; i++) {
    var lat = readInt32() / 1000000.0;
    var lng = readInt32() / 1000000.0;
    gps.push({
      lat: lat,
      lng: lng,
      valid: (lat !== 0 || lng !== 0)
    });
  }

  // Flexiforces (3 × 15 octets = 120 bits chacun)
  var f1 = readBits(15, 120);
  var f2 = readBits(15, 120);
  var f3 = readBits(15, 120);

  // IMU accélération (40 × 2 octets)
  var imu = [];
  for (var i = 0; i < 40; i++) {
    imu.push(readUint16() / 100.0);
  }

  // --- Résumé flexiforces ---
  var f1_count = f1.filter(function(b){ return b === 1; }).length;
  var f2_count = f2.filter(function(b){ return b === 1; }).length;
  var f3_count = f3.filter(function(b){ return b === 1; }).length;

  // --- Résumé IMU ---
  var imu_max = Math.max.apply(null, imu);
  var imu_avg = imu.reduce(function(a, b){ return a + b; }, 0) / imu.length;

  return {
    data: {
      timestamp:   timestamp,
      gps:         gps,
      flexi1_bits: f1,
      flexi2_bits: f2,
      flexi3_bits: f3,
      flexi1_contacts: f1_count,
      flexi2_contacts: f2_count,
      flexi3_contacts: f3_count,
      imu_acc_ms2: imu,
      imu_max_ms2: Math.round(imu_max * 100) / 100,
      imu_avg_ms2: Math.round(imu_avg * 100) / 100
    },
    warnings: [],
    errors:   []
  };
}