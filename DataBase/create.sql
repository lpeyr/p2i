-- Enregistrement
CREATE table if not EXISTS "Enregistrement"(
    "idEnregistrement" int(10) unsigned NOT NULL AUTO_INCREMENT,
    "heureDebut" datetime NOT NULL,
    "heureFin" datetime
    PRIMARY KEY ("idEnregistrement")
)

-- Semelle
Create table if not EXISTS "Semelle"(
    "idSemelle" int(10) unsigned NOT NULL AUTO_INCREMENT,
    "side" varchar(255) NOT NULL,
    PRIMARY KEY ("idSemelle")
)

