# P2I

Projet autour d'une solution de suivi de semelles connectées : application web, base de données, schémas et programmes
embarqués.

## Dossiers principaux

- `semelle/` : application web Next.js pour visualiser et exploiter les données des semelles.
- `bdd/` : scripts SQL, schémas et documents liés à la base de données.
- `Programmes Arduino/` : firmwares Arduino et essais liés aux capteurs, à l'IMU, au GPS et au LoRa.
- `scripts/` : scripts d'installation ou d'automatisation.

## Lancement rapide

- Base de données : `compose.yaml` démarre un conteneur MariaDB.
- Application : voir le détail dans `semelle/README.md`.

## Objectifs

- Collecter des données de marche via des semelles connectées.
- Analyser ces données pour détecter des anomalies ou suivre la santé.
- Offrir une interface utilisateur pour visualiser les données et les analyses.
- Respecter les contraintes de communication (LoRa) tout en assurant une acquisition de qualité.
- Permettre une évolutivité pour intégrer de nouveaux capteurs ou fonctionnalités à l'avenir.

## License

MIT
