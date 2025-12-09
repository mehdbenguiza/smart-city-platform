import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import "./App.css";

// Fix icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const [currentPage, setCurrentPage] = useState("dashboard");

  const [transports, setTransports] = useState([]);
  const [aqi, setAqi] = useState("...");
  const [parkings, setParkings] = useState([]);
  const [tickets, setTickets] = useState([]);

  const [selectedLine, setSelectedLine] = useState("");
  const [selectedParkingName, setSelectedParkingName] = useState("");

  const [showMap, setShowMap] = useState(false);
  const [mapType, setMapType] = useState("");
  const [mapData, setMapData] = useState({});

  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [shareMessage, setShareMessage] = useState("");

  const ticketRefs = useRef([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      loadData();
      loadTickets();
    }
  }, []);

  const loadData = async () => {
    try {
      const t = await axios.get("http://localhost:3001/api/lines");
      setTransports(t.data || []);

      const soap = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body><getAQIRequest xmlns="http://smartcity.com/airquality">
          <zone>Centre</zone>
        </getAQIRequest></soap:Body></soap:Envelope>`;

      const a = await axios.post("http://localhost:3002/ws", soap, {
        headers: { "Content-Type": "text/xml" }
      });

      const m = a.data.match(/<aqi>([0-9]+)<\/aqi>/);
      setAqi(m ? m[1] : "42");

      const p = await axios.post("http://localhost:3004/graphql", {
        query: `{ parkings { name availableSpaces totalSpaces pricePerHour } }`
      });
      setParkings(p.data?.data?.parkings || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTickets = async () => {
    try {
      const res = await axios.get("http://localhost:3006/reservations", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setTickets(res.data || []);
    } catch {}
  };

  const getRandomPosition = () => {
    const lat = 33.5731 + (Math.random() - 0.5) * 0.1;
    const lng = -7.5898 + (Math.random() - 0.5) * 0.1;
    return [lat, lng];
  };

  const getRandomPath = () => {
    const start = getRandomPosition();
    const end = getRandomPosition();
    return [start, end];
  };

  const showParkingMap = (parking) => {
    setMapType("parking");
    setMapData({
      name: parking.name,
      position: getRandomPosition()
    });
    setShowMap(true);
  };

  const showTransportMap = (line) => {
    setMapType("transport");
    setMapData({
      name: line.name,
      path: getRandomPath()
    });
    setShowMap(true);
  };

  const closeMap = () => setShowMap(false);

  const reserveTransport = async () => {
    if (!selectedLine) return setMessage("Veuillez choisir une ligne");
    try {
      await axios.post("http://localhost:3006/reserve-transport", { lineId: selectedLine }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      loadTickets();
      setMessage("✅ Billet transport réservé avec succès !");
      setSelectedLine("");
    } catch { setMessage("❌ Erreur lors de la réservation"); }
  };

  const reserveParking = async () => {
    if (!selectedParkingName) return setMessage("Veuillez choisir un parking");
    try {
      await axios.post("http://localhost:3004/graphql", {
        query: `mutation { reserveParking(name: "${selectedParkingName}") { name availableSpaces } }`
      });
      await axios.post("http://localhost:3006/reserve-parking", { name: selectedParkingName }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      loadData();
      loadTickets();
      setMessage("✅ Place de parking réservée avec succès !");
      setSelectedParkingName("");
    } catch { setMessage("❌ Parking complet ou erreur de réservation"); }
  };

  const signup = async () => {
    try {
      await axios.post("http://localhost:3006/signup", { username, password });
      setMessage("✅ Compte créé avec succès ! Connectez-vous maintenant");
    } catch { setMessage("❌ Ce nom d'utilisateur est déjà pris"); }
  };

  const login = async () => {
    try {
      const res = await axios.post("http://localhost:3006/login", { username, password });
      localStorage.setItem("token", res.data.token);
      setIsLoggedIn(true);
      setMessage("");
      loadData();
      loadTickets();
    } catch { setMessage("❌ Identifiants incorrects"); }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
  };

  // Fonction pour télécharger le ticket en PDF
  const downloadTicketAsPDF = async (ticket, index) => {
    try {
      const ticketElement = ticketRefs.current[index];
      if (!ticketElement) return;

      const canvas = await html2canvas(ticketElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const x = (210 - imgWidth) / 2;
      const y = (297 - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      
      // Ajouter des informations supplémentaires
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Smart City Platform - Ticket généré le ${new Date().toLocaleDateString()}`, 105, 20, { align: 'center' });
      
      const fileName = `Ticket_${ticket.type}_${ticket.details.lineId || ticket.details.name}_${Date.now()}.pdf`;
      pdf.save(fileName);
      
      setMessage("✅ Ticket téléchargé en PDF !");
    } catch (error) {
      console.error("Erreur lors du téléchargement PDF:", error);
      setMessage("❌ Erreur lors du téléchargement");
    }
  };

  // Fonction pour ouvrir le modal de partage
  const openShareModal = (ticket) => {
    setSelectedTicket(ticket);
    setShareMessage(`Regardez mon ticket ${ticket.type === 'transport' ? 'de transport' : 'de parking'} sur Smart City Platform!`);
    setShowShareModal(true);
  };

  // Fonction pour partager sur Facebook
  const shareOnFacebook = () => {
    const text = encodeURIComponent(shareMessage);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
  };

  // Fonction pour partager sur Twitter
  const shareOnTwitter = () => {
    const text = encodeURIComponent(shareMessage);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  // Fonction pour partager par email
  const shareByEmail = () => {
    const subject = encodeURIComponent("Mon ticket Smart City");
    const body = encodeURIComponent(`${shareMessage}\n\nDétails:\nType: ${selectedTicket.type}\nDate: ${new Date(selectedTicket.date).toLocaleString()}\n\nConsultez sur: ${window.location.href}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Fonction pour copier le lien
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        setMessage("✅ Lien copié dans le presse-papier !");
        setTimeout(() => setMessage(""), 3000);
      })
      .catch(err => {
        setMessage("❌ Erreur lors de la copie");
        console.error('Erreur de copie:', err);
      });
  };

  if (!isLoggedIn) {
    return (
      <div className="login-full">
        <header>
          <h1>🏙️ Smart City Platform</h1>
          <p>La ville intelligente de demain, aujourd'hui - Gérez votre mobilité urbaine en un clic</p>
        </header>
        <div className="login-container">
          <h2>Connexion / Inscription</h2>
          <input 
            type="text" 
            placeholder="Nom d'utilisateur" 
            value={username} 
            onChange={e => setUsername(e.target.value)}
            className="input-field"
          />
          <input 
            type="password" 
            placeholder="Mot de passe" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            className="input-field"
          />
          <div className="buttons">
            <button onClick={signup} className="btn-secondary">S'inscrire</button>
            <button onClick={login} className="btn-primary">Se connecter</button>
          </div>
          {message && <p className={message.includes("✅") ? "success" : "error"}>{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <span className="nav-icon">🏙️</span>
          Smart City
        </div>
        <div className="nav-links">
          <button onClick={() => setCurrentPage("dashboard")} className={currentPage === "dashboard" ? "active" : ""}>
            <span className="nav-icon">🏠</span>
            Tableau de bord
          </button>
          <button onClick={() => setCurrentPage("reserve")} className={currentPage === "reserve" ? "active" : ""}>
            <span className="nav-icon">🎫</span>
            Réserver
          </button>
          <button onClick={() => setCurrentPage("tickets")} className={currentPage === "tickets" ? "active" : ""}>
            <span className="nav-icon">📋</span>
            Mes Tickets
          </button>
          <button onClick={logout} className="logout-nav">
            <span className="nav-icon">🚪</span>
            Déconnexion
          </button>
        </div>
      </nav>

      {currentPage === "dashboard" && (
        <>
          <div className="dashboard-header">
            <h1>Bonjour, {username} !</h1>
            <p>Bienvenue sur la plateforme Smart City - Gérez votre mobilité urbaine intelligente</p>
          </div>

          <div className="section-container">
            <div className="section">
              <div className="section-header">
                <h2>🚌 Transports Publics</h2>
                <span className="section-subtitle">Cliquez sur une ligne pour voir son trajet</span>
              </div>
              <div className="transport-grid">
                {transports.map(t => (
                  <div key={t.lineId} className="transport-card" onClick={() => showTransportMap(t)}>
                    <h3>
                      {t.type === 'bus' ? '🚌' : t.type === 'tram' ? '🚊' : '🚇'}
                      {t.name}
                    </h3>
                    <div className="transport-details">
                      <span className="transport-type">{t.type?.toUpperCase()}</span>
                      <p>Fréquence: 10-15 min</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="section">
              <div className="section-header">
                <h2>🌤️ Qualité de l'air</h2>
                <span className="section-subtitle">Centre Ville - Temps réel</span>
              </div>
              <div className="aqi-section">
                <div className={`aqi-value ${aqi <= 50 ? "aqi-good" : aqi <= 100 ? "aqi-moderate" : "aqi-bad"}`}>
                  {aqi}
                </div>
                <p className="aqi-label">Indice de qualité de l'air</p>
                <div className="aqi-info">
                  {aqi <= 50 ? "✅ Bonne qualité" : aqi <= 100 ? "⚠️ Qualité modérée" : "❌ Mauvaise qualité"}
                </div>
              </div>
            </div>

            <div className="section">
              <div className="section-header">
                <h2>🅿️ Parkings Intelligents</h2>
                <span className="section-subtitle">Disponibilité en temps réel - Cliquez pour voir l'emplacement</span>
              </div>
              <div className="parking-grid">
                {parkings.map(p => (
                  <div
                    key={p.name}
                    className={`parking-card ${p.availableSpaces === 0 ? "full" : p.availableSpaces < 20 ? "almost-full" : "available"}`}
                    onClick={() => showParkingMap(p)}
                  >
                    <div className="parking-info">
                      <div>
                        <h3>{p.name}</h3>
                        <p className="parking-location">📍 Centre-ville</p>
                      </div>
                      <div className="parking-spaces">
                        {p.availableSpaces}<span>/{p.totalSpaces}</span>
                      </div>
                    </div>
                    <div className="parking-details">
                      <span className="parking-price">
                        {p.pricePerHour === 0 ? "GRATUIT" : `${p.pricePerHour}€/h`}
                      </span>
                      <div className={`parking-status status-${p.availableSpaces === 0 ? "full" : p.availableSpaces < 20 ? "almost" : "available"}`}>
                        {p.availableSpaces === 0 ? "COMPLET" : p.availableSpaces < 20 ? "LIMITÉ" : "DISPONIBLE"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {currentPage === "reserve" && (
        <div className="reserve-page">
          <h1>🎫 Réserver un Service</h1>
          <p className="page-subtitle">Réservez vos billets de transport et places de parking en un clic</p>
          
          <div className="reserve-grid">
            <div className="reserve-card">
              <div className="reserve-card-header">
                <h2>🚌 Transport Public</h2>
                <span className="card-icon">🎫</span>
              </div>
              <select value={selectedLine} onChange={e => setSelectedLine(e.target.value)} className="select-field">
                <option value="">Choisir une ligne de transport</option>
                {transports.map(t => <option key={t.lineId} value={t.lineId}>{t.name} - {t.type}</option>)}
              </select>
              <div className="reserve-info">
                <p>• Billet valable 1 heure</p>
                <p>• Accès illimité aux transports</p>
                <p>• Prix: 5 DH</p>
              </div>
              <button onClick={reserveTransport} className="reserve-big-btn">
                <span className="btn-icon">✅</span>
                Réserver Billet Transport
              </button>
            </div>

            <div className="reserve-card">
              <div className="reserve-card-header">
                <h2>🅿️ Place de Parking</h2>
                <span className="card-icon">🚗</span>
              </div>
              <select value={selectedParkingName} onChange={e => setSelectedParkingName(e.target.value)} className="select-field">
                <option value="">Choisir un parking</option>
                {parkings.filter(p => p.availableSpaces > 0).map(p => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.availableSpaces} places disponibles) - {p.pricePerHour}€/h
                  </option>
                ))}
              </select>
              <div className="reserve-info">
                <p>• Réservation garantie 15 min</p>
                <p>• Paiement à la sortie</p>
                <p>• Surveillance 24h/24</p>
              </div>
              <button onClick={reserveParking} className="reserve-big-btn">
                <span className="btn-icon">✅</span>
                Réserver Place Parking
              </button>
            </div>
          </div>
          
          {message && <div className="message-container"><p className={message.includes("✅") ? "reserve-msg success" : "reserve-msg error"}>{message}</p></div>}
        </div>
      )}

      {currentPage === "tickets" && (
        <div className="tickets-page">
          <h1>📋 Mes Tickets & Réservations</h1>
          <p className="page-subtitle">Consultez et gérez toutes vos réservations</p>
          
          {tickets.length === 0 ? (
            <div className="no-ticket">
              <div className="no-ticket-icon">🎫</div>
              <h3>Aucun ticket réservé</h3>
              <p>Vous n'avez pas encore réservé de services. Allez dans l'onglet "Réserver" pour commencer !</p>
            </div>
          ) : (
            <div className="ticket-grid">
              {tickets.map((ticket, i) => (
                <div key={i} className="ticket-card" ref={el => ticketRefs.current[i] = el}>
                  <div className="ticket-header">
                    <span className={`ticket-type ticket-type-${ticket.type}`}>
                      {ticket.type === "transport" ? "🚌 Transport" : "🅿️ Parking"}
                    </span>
                    <span className="ticket-date">{new Date(ticket.date).toLocaleString()}</span>
                  </div>
                  <div className="ticket-content">
                    <h3>{ticket.type === "transport" ? "Ligne " + (ticket.details.lineId || "") : ticket.details.name}</h3>
                    <p className="ticket-details">
                      {ticket.type === "transport" 
                        ? "Billet de transport public"
                        : `Place n°${Math.floor(Math.random() * 100) + 1}`
                      }
                    </p>
                    <div className="ticket-qr-container">
                      <img src={ticket.ticket} alt="QR Code" className="ticket-qr" />
                    </div>
                    <div className="ticket-id">ID: {ticket.type === "transport" ? `TR-${ticket.details.lineId}` : `PK-${ticket.details.name}`}-{Date.now().toString().slice(-6)}</div>
                    <div className="ticket-actions">
                      <button className="btn-small share-btn" onClick={() => openShareModal(ticket)}>
                        <span className="btn-icon">📱</span>
                        Partager
                      </button>
                      <button className="btn-small download-btn" onClick={() => downloadTicketAsPDF(ticket, i)}>
                        <span className="btn-icon">📥</span>
                        Télécharger
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showMap && (
        <div className="modal-overlay" onClick={closeMap}>
          <div className="map-modal" onClick={e => e.stopPropagation()}>
            <h2>{mapType === "parking" ? "📍 " + mapData.name : "🚌 Trajet - " + mapData.name}</h2>
            <div className="map-container">
              <MapContainer 
                center={mapType === "parking" ? mapData.position : mapData.path[0]} 
                zoom={14} 
                style={{ height: "400px", width: "100%", borderRadius: "12px" }}
              >
                <TileLayer 
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {mapType === "parking" && (
                  <Marker position={mapData.position}>
                    <Popup>
                      <strong>{mapData.name}</strong><br />
                      🅿️ Parking disponible
                    </Popup>
                  </Marker>
                )}
                {mapType === "transport" && (
                  <>
                    <Marker position={mapData.path[0]}>
                      <Popup>
                        <strong>Départ</strong><br />
                        Station {mapData.name}
                      </Popup>
                    </Marker>
                    <Marker position={mapData.path[1]}>
                      <Popup>
                        <strong>Arrivée</strong><br />
                        Station {mapData.name}
                      </Popup>
                    </Marker>
                    <Polyline positions={mapData.path} color="#d10000" weight={4} opacity={0.7} />
                  </>
                )}
              </MapContainer>
            </div>
            <div className="modal-info">
              <p>{mapType === "parking" 
                ? "Ce parking est équipé de capteurs intelligents pour une gestion optimale des places"
                : "Ce trajet est optimisé pour réduire le temps de transport et les émissions CO₂"}
              </p>
            </div>
            <button onClick={closeMap} className="close-btn">
              <span className="btn-icon">✕</span>
              Fermer la carte
            </button>
          </div>
        </div>
      )}

      {showShareModal && selectedTicket && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal" onClick={e => e.stopPropagation()}>
            <h2>📤 Partager le Ticket</h2>
            <div className="share-modal-content">
              <div className="share-preview">
                <h3>{selectedTicket.type === "transport" ? "🚌 Ticket Transport" : "🅿️ Ticket Parking"}</h3>
                <p>{selectedTicket.type === "transport" 
                  ? `Ligne ${selectedTicket.details.lineId}`
                  : selectedTicket.details.name}</p>
                <p className="share-date">{new Date(selectedTicket.date).toLocaleString()}</p>
              </div>
              
              <div className="share-message-input">
                <label>Message de partage:</label>
                <textarea 
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  rows="3"
                  placeholder="Ajoutez un message personnalisé..."
                />
              </div>
              
              <div className="share-platforms">
                <h3>Partager sur:</h3>
                <div className="platform-buttons">
                  <button className="platform-btn facebook" onClick={shareOnFacebook}>
                    <span className="platform-icon">f</span>
                    Facebook
                  </button>
                  <button className="platform-btn twitter" onClick={shareOnTwitter}>
                    <span className="platform-icon">𝕏</span>
                    Twitter
                  </button>
                  <button className="platform-btn email" onClick={shareByEmail}>
                    <span className="platform-icon">✉️</span>
                    Email
                  </button>
                  <button className="platform-btn copy" onClick={copyLink}>
                    <span className="platform-icon">🔗</span>
                    Copier lien
                  </button>
                </div>
              </div>
              
              <div className="share-actions">
                <button className="btn-secondary" onClick={() => setShowShareModal(false)}>
                  Annuler
                </button>
                <button className="btn-primary" onClick={shareOnFacebook}>
                  Partager maintenant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer>
        <p>🏙️ Projet Service Oriented Computing – GINF 2025-2026 – Développé par Mehdi</p>
        <p className="footer-sub">Plateforme Smart City - Tous droits réservés</p>
      </footer>
    </div>
  );
}
