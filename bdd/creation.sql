DROP TABLE IF EXISTS MesureAccel;
DROP TABLE IF EXISTS MesureAngle;
DROP TABLE IF EXISTS MesureIMU;

DROP TABLE IF EXISTS MesureFlexi;

DROP TABLE IF EXISTS MesureGPS;

DROP TABLE IF EXISTS Session;
DROP TABLE IF EXISTS Semelle;

DROP TABLE IF EXISTS Utilisateur;

CREATE TABLE Utilisateur
(
    idUser INT(10) UNSIGNED auto_increment PRIMARY KEY,
    nom    VARCHAR(50) NOT NULL,
    prenom VARCHAR(50) NOT NULL,
    role   ENUM('admin', 'podologue', 'patient', 'coureur') NOT NULL,
    age    INT(10) Unsigned NOT NULL,
    poids  INT(10) Unsigned NOT NULL,
    taille INT(10) Unsigned NOT NULL
);


CREATE TABLE Semelle
(
    idSemelle INT(10) UNSIGNED auto_increment PRIMARY KEY,
    idUser    INT(10) UNSIGNED      NOT NULL,
    devEUI    CHAR(16)              NOT NULL,
    side      enum("left", "right") NOT NULL,
    FOREIGN KEY (idUser) REFERENCES Utilisateur (idUser)
);

CREATE TABLE Session
(
    idSession       INT(10) UNSIGNED auto_increment PRIMARY KEY,
    dateDebut       DATETIME NOT NULL,
    dateFin         DATETIME,
    semelle1        INT(10) UNSIGNED NOT NULL,
    semelle2        INT(10) UNSIGNED NOT NULL,
    step            INT(10) UNSIGNED,
    averageStepTime FLOAT(4, 2) UNSIGNED,
    FOREIGN KEY (semelle1) REFERENCES Semelle (idSemelle),
    FOREIGN KEY (semelle2) REFERENCES Semelle (idSemelle),
    CONSTRAINT CHECK (dateFin IS NULL OR dateFin > dateDebut)
);

CREATE TABLE MesureGPS
(
    idMesure  INT(10) UNSIGNED auto_increment PRIMARY KEY NOT NULL,
    time      TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    lattitude FLOAT,
    longitude FLOAT,
    idSession INT(10) UNSIGNED                            NOT NULL,
    idSemelle INT(10) UNSIGNED                            NOT NULL,
    FOREIGN KEY (idSession) REFERENCES Session (idSession),
    FOREIGN KEY (idSemelle) REFERENCES Semelle (idSemelle)
);


CREATE TABLE MesureFlexi
(
    idMesureFlexi INT(10) UNSIGNED auto_increment PRIMARY KEY NOT NULL,
    time          TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    flexi1        bool NOT NULL,
    flexi2        bool NOT NULL,
    flexi3        bool NOT NULL,
    idSession     INT(10) UNSIGNED                            NOT NULL,
    idSemelle     INT(10) UNSIGNED                            NOT NULL,
    FOREIGN KEY (idSession) REFERENCES Session (idSession),
    FOREIGN KEY (idSemelle) REFERENCES Semelle (idSemelle)
);

CREATE TABLE MesureAccel
(
    idMesureAccel INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    time          TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    accel         FLOAT(4, 2) NOT NULL,
    idSession     INT(10) UNSIGNED NOT NULL,
    idSemelle     INT(10) UNSIGNED NOT NULL,
    FOREIGN KEY (idSession) REFERENCES Session (idSession),
    FOREIGN KEY (idSemelle) REFERENCES Semelle (idSemelle)
)
;

CREATE TABLE MesureAngle
(
    idMesureAngle INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    time          TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    yaw           FLOAT(4, 2) NOT NULL,
    pitch         FLOAT(4, 2) NOT NULL,
    roll          FLOAT(4, 2) NOT NULL,
    idSession     INT(10) UNSIGNED NOT NULL,
    idSemelle     INT(10) UNSIGNED NOT NULL,
    FOREIGN KEY (idSession) REFERENCES Session (idSession),
    FOREIGN KEY (idSemelle) REFERENCES Semelle (idSemelle)
);
