# Projet Smart City Platform - Mehdi Benguiza

## Fonctionnalités
- Authentification complète (inscription/connexion)
- Dashboard temps réel (transports, AQI, parkings)
- Réservation transport/parking avec QR code
- Clic parking → emplacement carte
- Clic transport → trajet en ligne rouge
- Persistance MongoDB (utilisateurs, tickets, places)

## Lancement
```bash
docker compose up -d --build
cd frontend
npm install
npm run dev -- --host
