/**
 * Mini-docs affichées dans l'admin Channels → Debug (bouton "i").
 *
 * Source: docs/RU (repo backend) + documentation officielle RentalsUnited.
 * Chaque entrée décrit ce que fait l'API du point de vue MÉTIER (gestionnaire de propriétés).
 */
export const RU_API_DOCS = {
  // ──────────────────────────────────────────────
  // Dictionnaires / Référentiels
  // ──────────────────────────────────────────────
  Pull_ListAmenities_RQ: {
    summary:
      "Récupère le catalogue complet des équipements reconnus par les OTA (Wi-Fi, piscine, climatisation, parking, etc.). " +
      "Sojori s'en sert pour mapper les équipements de chaque annonce vers les codes attendus par Booking.com, Airbnb et les autres canaux de distribution. " +
      "À synchroniser environ une fois par mois ou quand RU notifie un changement de dictionnaire.",
  },
  Pull_ListAmenitiesAvailableForRooms_RQ: {
    summary:
      "Même principe que la liste d'équipements, mais spécifique aux chambres individuelles (ex. sèche-cheveux, coffre-fort dans la chambre). " +
      "Utilisé quand l'annonce est de type multi-chambres pour décrire ce que chaque chambre propose au voyageur.",
  },
  Pull_ListPropTypes_RQ: {
    summary:
      "Liste les types de propriétés que RU reconnaît (appartement, villa, maison, studio, chambre d'hôtes, etc.). " +
      "Sojori utilise cette liste pour associer le bon type de bien à chaque annonce afin qu'il apparaisse correctement sur les OTA.",
  },
  Pull_ListOTAPropTypes_RQ: {
    summary:
      "Variante de la liste des types de propriétés, spécifique aux OTA. Chaque canal (Booking.com, Airbnb…) peut avoir ses propres catégories : " +
      "cette API permet de vérifier que le mapping de type de bien est cohérent sur chaque plateforme de réservation.",
  },
  Pull_ListDepositTypes_RQ: {
    summary:
      "Liste les types de caution / dépôt de garantie que le gestionnaire peut exiger (carte bancaire, virement, espèces à l'arrivée, etc.). " +
      "Permet de configurer les conditions financières du séjour affichées sur les OTA.",
  },
  Pull_ListPaymentMethods_RQ: {
    summary:
      "Liste tous les modes de paiement acceptables (carte Visa, MasterCard, PayPal, virement, espèces…). " +
      "Sojori les envoie à RU pour indiquer aux voyageurs sur chaque OTA quels moyens de paiement le gestionnaire accepte.",
  },
  Pull_ListStatuses_RQ: {
    summary:
      "Référentiel des codes statut de l'API RU (succès, erreur, propriété introuvable, etc.). " +
      "Utilisé en interne pour interpréter les réponses de l'API et afficher des messages d'erreur compréhensibles dans le dashboard.",
  },
  Pull_ListImageTypes_RQ: {
    summary:
      "Liste les catégories de photos reconnues (photo principale, salle de bain, cuisine, vue extérieure, plan d'étage…). " +
      "Sojori associe chaque image de l'annonce à la bonne catégorie pour un affichage optimal sur les plateformes de réservation.",
  },
  Pull_ListLanguages_RQ: {
    summary:
      "Liste des langues supportées par RU (français, anglais, espagnol, allemand, arabe…). " +
      "Utilisé pour envoyer les descriptions, instructions d'arrivée et messages dans la bonne langue selon le marché cible de chaque OTA.",
  },
  Pull_GetLocationDetails_RQ: {
    summary:
      "Détails géographiques d'un lieu : pays → régions → villes → quartiers. " +
      "Permet de positionner précisément une annonce dans l'arborescence géographique de RU pour une visibilité optimale sur les moteurs de recherche des OTA.",
  },
  Pull_ListLocations_RQ: {
    summary:
      "Référentiel complet des localisations géographiques (pays, villes, zones touristiques). " +
      "Sojori synchronise cette liste pour mapper l'adresse de chaque propriété avec les codes géographiques exigés par les canaux de réservation.",
  },
  Pull_ListCurrencies_RQ: {
    summary:
      "Liste des devises supportées (EUR, USD, GBP, MAD…). " +
      "Le gestionnaire peut choisir la devise dans laquelle il publie ses tarifs ; les OTA convertissent ensuite pour le voyageur.",
  },

  // ──────────────────────────────────────────────
  // Listings (annonces / propriétés)
  // ──────────────────────────────────────────────
  Pull_ListProperties_RQ: {
    summary:
      "Récupère la liste de toutes les propriétés d'un propriétaire (owner) dans RU. " +
      "Sojori utilise cette API lors de la synchronisation périodique pour vérifier quelles annonces existent côté RU, " +
      "détecter les nouvelles et identifier celles qui auraient été archivées ou désactivées.",
  },
  Pull_ListSpecProp_RQ: {
    summary:
      "Récupère la fiche détaillée complète d'une propriété : nom, adresse, coordonnées GPS, surface, nombre de voyageurs, " +
      "équipements, photos, descriptions multilingues, instructions d'arrivée, conditions d'annulation, frais additionnels. " +
      "C'est l'API qui permet de voir exactement ce que les OTA affichent pour cette annonce.",
  },
  Pull_GetMinStay_RQ: {
    summary:
      "Récupère la durée de séjour minimum configurée pour une propriété (ex. 2 nuits minimum, 7 nuits en haute saison). " +
      "Les OTA bloquent les réservations plus courtes que ce seuil.",
  },
  Push_PutBuilding_RQ: {
    summary:
      "Crée ou met à jour un immeuble (building) dans RU. Un building regroupe plusieurs propriétés " +
      "(ex. résidence avec 10 appartements). Obligatoire pour les propriétés multi-unités (hôtel, résidence). " +
      "Le nom de l'immeuble apparaît dans l'organisation du portefeuille du gestionnaire.",
  },
  Push_PutProperty_RQ: {
    summary:
      "Crée ou met à jour une annonce complète dans RU : nom, type de bien, adresse et GPS, surface, capacité d'accueil, " +
      "équipements (Wi-Fi, piscine…), photos avec catégories, descriptions multilingues, instructions d'arrivée, " +
      "conditions d'annulation, frais de ménage, taxe de séjour, caution… " +
      "C'est l'API principale de publication : chaque modification de fiche annonce passe par elle. " +
      "Fréquence recommandée : à chaque modification ou au minimum une fois par semaine.",
  },
  Push_PutComposition_RQ: {
    summary:
      "Définit la composition des chambres d'une propriété : nombre de chambres, type de lit (double, simple, superposé…), " +
      "salle de bain privée ou partagée, équipements par chambre. " +
      "Indispensable pour que les OTA affichent correctement la disposition des lits et aident le voyageur à choisir.",
  },
  Push_PutDescription_RQ: {
    summary:
      "Envoie ou met à jour les descriptions textuelles multilingues de l'annonce (titre, description courte, description longue, " +
      "règles de la maison, politique de quartier). Chaque langue est envoyée séparément pour toucher les marchés internationaux " +
      "(anglais pour les anglo-saxons, français pour la France, arabe pour le Moyen-Orient, etc.).",
  },
  Push_PutImage_RQ: {
    summary:
      "Envoie ou met à jour les photos de l'annonce. Chaque image est associée à une catégorie (salon, chambre, salle de bain, vue…). " +
      "Les OTA exigent un minimum de 10 photos haute résolution (1024×683 px). " +
      "L'ordre et la catégorisation des photos influencent directement le taux de conversion des voyageurs.",
  },
  Push_PutLocation_RQ: {
    summary:
      "Met à jour la localisation géographique de l'annonce : adresse, code postal, coordonnées GPS, " +
      "distances aux points d'intérêt (plage, centre-ville, aéroport…). " +
      "Un positionnement géographique précis améliore le classement dans les résultats de recherche des OTA.",
  },
  Push_PutPaymentMethods_RQ: {
    summary:
      "Configure les modes de paiement que le gestionnaire accepte pour cette propriété (carte bancaire, espèces, virement…). " +
      "Cette information est affichée au voyageur lors de la réservation sur chaque OTA.",
  },
  Push_PutMinStay_RQ: {
    summary:
      "Définit la durée de séjour minimum par période (ex. 2 nuits en basse saison, 7 nuits en juillet-août). " +
      "Empêche les réservations trop courtes qui ne seraient pas rentables pour le gestionnaire. " +
      "Les OTA masquent automatiquement les dates qui ne respectent pas ce critère.",
  },
  Push_PutChangeOver_RQ: {
    summary:
      "Configure les jours d'arrivée et de départ autorisés par date (ex. arrivée uniquement le samedi en été). " +
      "Permet d'optimiser le taux d'occupation en évitant les « trous » entre deux séjours. " +
      "Les OTA n'affichent que les dates compatibles avec ces règles de changeover.",
  },

  // ──────────────────────────────────────────────
  // Calendrier / Tarification / Disponibilité
  // ──────────────────────────────────────────────
  Pull_ListReservations_RQ: {
    summary:
      "Récupère toutes les réservations (nouvelles, modifiées, annulées) sur une fenêtre de temps. " +
      "Sojori appelle cette API toutes les 10 à 30 minutes pour synchroniser les réservations OTA dans son système. " +
      "C'est le filet de sécurité qui complète les webhooks temps-réel (RLNM) pour ne jamais rater une réservation.",
  },
  Push_PutPrices_RQ: {
    summary:
      "Envoie les tarifs journaliers de la propriété vers toutes les OTA. " +
      "Chaque jour des 365 prochains jours reçoit un prix. Les jours sans prix sont considérés comme indisponibles. " +
      "Utilisé par le module Dynamic Pricing de Sojori pour ajuster les tarifs automatiquement selon la demande, la saison, les événements locaux. " +
      "Fréquence : à chaque changement de prix ou au minimum toutes les 24h.",
  },
  Push_PutAvbUnits_RQ: {
    summary:
      "Envoie la disponibilité de la propriété vers les OTA : pour chaque plage de dates, indique si le logement est disponible ou bloqué. " +
      "Inclut aussi le minimum stay et les règles de changeover par date. " +
      "C'est l'API qui « ouvre » ou « ferme » le calendrier. Fréquence : à chaque modification ou toutes les 24h.",
  },
  Push_PutLongStayDiscounts_RQ: {
    summary:
      "Configure les remises pour les séjours longs (ex. -10% à partir de 7 nuits, -20% à partir de 28 nuits). " +
      "Les OTA affichent ces promotions aux voyageurs qui recherchent des séjours étendus, " +
      "ce qui améliore le taux d'occupation en basse saison.",
  },
  Push_PutLastMinuteDiscounts_RQ: {
    summary:
      "Configure les remises de dernière minute (ex. -15% si réservation dans les 3 jours avant l'arrivée). " +
      "Permet de remplir les créneaux qui risquent de rester vides. " +
      "Les OTA mettent en avant ces offres avec des badges « Bonne affaire » ou « Dernière minute ».",
  },
  Push_PutSeasons_RQ: {
    summary:
      "Définit les saisons tarifaires de la propriété (haute saison, basse saison, vacances scolaires, événements spéciaux…). " +
      "Les prix, durées minimum et règles de changeover peuvent varier selon la saison. " +
      "Permet au gestionnaire de structurer sa stratégie tarifaire annuelle.",
  },

  // ──────────────────────────────────────────────
  // Réservations / Leads / Demandes
  // ──────────────────────────────────────────────
  Pull_GetReservationDetails_RQ: {
    summary:
      "Récupère le détail complet d'une réservation : dates de séjour, nom du voyageur, nombre de personnes, " +
      "prix payé, commission OTA, statut de paiement, carte bancaire (si PCI), commentaires du voyageur. " +
      "Utilisé pour afficher les détails d'une réservation dans le dashboard ou pour résoudre un litige.",
  },
  Push_ConfirmReservation_RQ: {
    summary:
      "Confirme une demande de réservation (request) reçue d'un voyageur. " +
      "Certaines OTA (ex. Airbnb en mode Demande) envoient une demande que le gestionnaire doit accepter ou refuser. " +
      "Cette API valide la réservation et la rend définitive côté OTA.",
  },
  Push_RejectRequest_RQ: {
    summary:
      "Refuse une demande de réservation (request). Le voyageur est notifié que sa demande a été déclinée. " +
      "Important : un taux de refus élevé peut pénaliser le classement de l'annonce sur certaines OTA.",
  },
  Push_PutConfirmedReservationMulti_RQ: {
    summary:
      "Confirme une réservation multi-chambres (ex. groupe réservant 3 chambres dans une résidence). " +
      "Permet aussi de transformer une demande en réservation confirmée en renseignant le ReservationID. " +
      "Vérifie par défaut que les prix correspondent, sauf en mode QuoteMode.",
  },
  Push_CancelReservation_RQ: {
    summary:
      "Annule une réservation existante. Le calendrier est automatiquement rouvert pour les dates concernées. " +
      "Utile pour les no-shows (voyageur qui ne se présente pas). " +
      "Attention : toutes les OTA ne supportent pas l'annulation via API — certaines exigent une annulation dans leur extranet.",
  },
  Pull_GetLeads_RQ: {
    summary:
      "Récupère les leads (demandes de renseignement) reçus des voyageurs via les OTA. " +
      "Un lead n'est pas une réservation : c'est une question ou un intérêt du voyageur (ex. « Est-ce que les animaux sont acceptés ? »). " +
      "Le gestionnaire peut y répondre pour convertir le lead en réservation.",
  },

  // ──────────────────────────────────────────────
  // Users / Owners (gestionnaires de propriétés)
  // ──────────────────────────────────────────────
  Pull_ListMyUsers_RQ: {
    summary:
      "Liste tous les propriétaires (owners) du compte RU. Chaque owner a un identifiant RU unique (ruOwnerId). " +
      "Sojori synchronise cette liste pour associer chaque propriétaire Sojori à son profil RU " +
      "et permettre la gestion multi-propriétaire (chaque owner peut avoir plusieurs annonces).",
  },
  Push_CreateUser_RQ: {
    summary:
      "Crée un nouveau propriétaire (owner) dans RU. Nécessaire quand un nouveau client Sojori " +
      "veut distribuer ses annonces sur les OTA. L'owner RU reçoit ses propres clés API et peut gérer son portefeuille.",
  },
  Push_FillCompanyDetails_RQ: {
    summary:
      "Envoie les informations légales et de contact du propriétaire vers RU : " +
      "nom de l'entreprise, SIRET/SIREN, adresse du siège, téléphone, email, informations de licence touristique. " +
      "Obligatoire pour la certification sur certaines OTA (Booking.com exige les infos légales de l'hébergeur).",
  },
  Push_ArchiveUser_RQ: {
    summary:
      "Archive un propriétaire dans RU. Toutes ses annonces sont retirées des OTA. " +
      "⚠️ Action irréversible côté RU — à utiliser uniquement quand un propriétaire quitte définitivement la plateforme.",
  },
  LNM_PutHandlerUrl_RQ: {
    summary:
      "Configure l'URL du webhook (RLNM) qui recevra les notifications temps-réel de RU : " +
      "nouvelle réservation, modification, annulation, nouveaux messages voyageur. " +
      "C'est grâce à cette URL que Sojori reçoit les réservations en quelques secondes au lieu d'attendre le polling toutes les 10 minutes.",
  },

  // ──────────────────────────────────────────────
  // Channel Manager (Distribution OTA)
  // ──────────────────────────────────────────────
  Pull_ListSalesChannels_RQ: {
    summary:
      "Liste tous les canaux de distribution OTA disponibles dans RU (Booking.com, Airbnb, Expedia, Vrbo, Hotels.com, etc.). " +
      "Permet au gestionnaire de voir quelles plateformes de réservation sont disponibles pour distribuer ses annonces.",
  },
  CM_Pull_PropertiesStatus_RQ: {
    summary:
      "Vérifie le statut de distribution de toutes les propriétés sur le Channel Manager : " +
      "activée, en attente de validation OTA, suspendue, bloquée pour contenu manquant. " +
      "Permet de détecter les annonces qui ne sont pas visibles sur les OTA et d'identifier la cause du blocage.",
  },
  CM_Pull_PropertySalesChannels_RQ: {
    summary:
      "Liste les canaux OTA activés pour une propriété spécifique (ex. cet appartement est distribué sur Booking.com et Airbnb, mais pas sur Expedia). " +
      "Permet de vérifier la stratégie de distribution de chaque annonce et d'identifier les canaux à activer pour maximiser la visibilité.",
  },
  CM_ChangePropertySalesChannel_RQ: {
    summary:
      "Active ou désactive un canal OTA pour une propriété (ex. ajouter Expedia, retirer Vrbo). " +
      "L'activation déclenche le processus de validation côté OTA (vérification du contenu, des photos, des conditions). " +
      "La désactivation retire l'annonce de la plateforme concernée.",
  },

  // ──────────────────────────────────────────────
  // OAuth PMS (authentification propriétaires)
  // ──────────────────────────────────────────────
  GetMasterToken: {
    summary:
      "Obtient le token d'authentification maître (administrateur) pour accéder à l'API RU au nom de tous les propriétaires. " +
      "C'est le token principal de Sojori qui permet d'agir sur l'ensemble du portefeuille de propriétés.",
  },
  GetUserToken: {
    summary:
      "Obtient un token d'authentification spécifique à un propriétaire (owner). " +
      "Utilisé quand une opération doit être exécutée au nom d'un propriétaire précis " +
      "(ex. publier l'annonce de M. Dupont sur Airbnb avec ses propres informations légales).",
  },

  // ──────────────────────────────────────────────
  // Webhooks entrants (notifications temps-réel)
  // ──────────────────────────────────────────────
  NewMessage: {
    summary:
      "Notification reçue quand un voyageur envoie un nouveau message via une OTA (Airbnb, Booking.com…). " +
      "Le message est importé dans Sojori pour que le gestionnaire puisse répondre depuis un seul endroit, " +
      "sans jongler entre les extranets de chaque plateforme.",
  },
  ModifiedMessage: {
    summary:
      "Notification reçue quand un message existant est modifié côté OTA (rare, mais possible sur certaines plateformes). " +
      "Sojori met à jour la conversation correspondante.",
  },
  ReadMessage: {
    summary:
      "Notification indiquant qu'un message a été lu par le voyageur ou le gestionnaire sur l'OTA. " +
      "Permet de synchroniser les indicateurs de lecture dans Sojori.",
  },
  NewThread: {
    summary:
      "Notification reçue quand une nouvelle conversation (thread) est créée avec un voyageur sur une OTA. " +
      "Un thread est ouvert lors du premier message d'un voyageur concernant une annonce ou une réservation.",
  },
  NewReservation: {
    summary:
      "Notification temps-réel qu'une nouvelle réservation a été créée sur une OTA. " +
      "Sojori reçoit les détails (dates, voyageur, prix) en quelques secondes et met à jour le calendrier, " +
      "les tâches ménage, les messages automatiques d'accueil. C'est le webhook le plus critique du système.",
  },
  ModifiedReservation: {
    summary:
      "Notification temps-réel qu'une réservation existante a été modifiée (changement de dates, nombre de voyageurs, montant). " +
      "Sojori recalcule les tâches ménage, ajuste le calendrier et notifie le gestionnaire si nécessaire.",
  },
  CancelledReservation: {
    summary:
      "Notification temps-réel qu'une réservation a été annulée par le voyageur ou l'OTA. " +
      "Sojori rouvre automatiquement le calendrier, annule les tâches planifiées et peut déclencher une relance automatique " +
      "pour remplir le créneau devenu libre.",
  },
  NewLead: {
    summary:
      "Notification temps-réel qu'un nouveau lead (demande de renseignement) a été reçu d'un voyageur. " +
      "Le gestionnaire peut répondre rapidement via Sojori pour maximiser ses chances de convertir la demande en réservation.",
  },

  // ──────────────────────────────────────────────
  // REST RU — Messagerie
  // ──────────────────────────────────────────────
  RU_REST_GET_api_messaging_threads: {
    summary:
      "Récupère la liste de toutes les conversations (threads) avec les voyageurs sur les OTA. " +
      "Permet d'afficher la boîte de réception unifiée dans Sojori.",
  },
  RU_REST_GET_api_messaging_threads_x: {
    summary:
      "Récupère les détails d'une conversation spécifique (participants, propriété concernée, statut).",
  },
  RU_REST_GET_api_messaging_threads_x_messages: {
    summary:
      "Récupère tous les messages d'une conversation avec un voyageur (historique complet de l'échange).",
  },
  RU_REST_POST_api_messaging_threads_x_messages: {
    summary:
      "Envoie un message au voyageur via l'OTA (réponse à une question, instructions d'arrivée, suivi de séjour). " +
      "Le message est transmis par RU à la plateforme d'origine (Airbnb, Booking.com…) et apparaît dans la messagerie du voyageur.",
  },
  RU_REST_PUT_api_messaging_threads_x_messages_markasread: {
    summary:
      "Marque les messages d'une conversation comme lus. " +
      "Synchronise le statut de lecture entre Sojori et l'OTA.",
  },
  RU_REST_GET_api_messaging_messages_x: {
    summary:
      "Récupère le contenu détaillé d'un message spécifique (texte, pièces jointes, date d'envoi, expéditeur).",
  },

  // ──────────────────────────────────────────────
  // REST RU — Avis voyageurs
  // ──────────────────────────────────────────────
  RU_REST_GET_api_reviews_thread_x: {
    summary:
      "Récupère un fil d'avis voyageur (review thread) pour une propriété. " +
      "Permet de suivre les notes et commentaires laissés par les voyageurs sur chaque OTA.",
  },
  RU_REST_GET_api_reviews_thread_x_messages: {
    summary:
      "Récupère les messages associés à un avis (commentaire du voyageur, réponse du gestionnaire). " +
      "Les réponses aux avis sont visibles publiquement sur l'OTA.",
  },
  RU_REST_POST_api_reviews_airbnb_review: {
    summary:
      "Publie un avis sur un voyageur Airbnb (note sur propreté, communication, respect des règles). " +
      "Sur Airbnb, l'avis du gestionnaire est publié en même temps que celui du voyageur.",
  },
  RU_REST_POST_api_reviews_vrbo_rateguest: {
    summary:
      "Évalue un voyageur sur Vrbo / Abritel (note et commentaire). " +
      "Aide les futurs gestionnaires à filtrer les demandes de réservation.",
  },
  RU_REST_POST_api_reviews_airbnb_reviewreply: {
    summary:
      "Répond publiquement à un avis voyageur sur Airbnb. " +
      "Les réponses professionnelles aux avis (positifs ou négatifs) améliorent la confiance des futurs voyageurs.",
  },
  RU_REST_POST_api_reviews_bcom_reviewreply: {
    summary:
      "Répond publiquement à un avis voyageur sur Booking.com. " +
      "Booking.com affiche la réponse directement sous l'avis, visible par tous les futurs clients.",
  },
  RU_REST_POST_api_reviews_vrbo_reviewreply: {
    summary:
      "Répond publiquement à un avis voyageur sur Vrbo / Abritel.",
  },
  RU_REST_POST_api_reviews_expedia_reviewreply: {
    summary:
      "Répond publiquement à un avis voyageur sur Expedia / Hotels.com.",
  },

  // ──────────────────────────────────────────────
  // REST RU — Leads / Offres spéciales Airbnb
  // ──────────────────────────────────────────────
  RU_REST_GET_api_airbnb_specialOffers: {
    summary:
      "Récupère les offres spéciales Airbnb envoyées aux voyageurs (prix personnalisé proposé suite à une demande). " +
      "Permet de suivre les négociations de prix en cours.",
  },
  RU_REST_POST_api_airbnb_specialOffers: {
    summary:
      "Crée une offre spéciale Airbnb : propose un prix personnalisé à un voyageur qui a fait une demande. " +
      "Utile pour négocier un tarif sur les séjours longs ou remplir un créneau en basse saison.",
  },
  RU_REST_PUT_api_airbnb_specialOffers: {
    summary:
      "Met à jour une offre spéciale Airbnb existante (modification du prix proposé ou des conditions).",
  },
};
