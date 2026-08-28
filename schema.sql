-- Script de création des tables pour Credit Simulateur

-- Créer l'extension UUID si elle n'existe pas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
);

-- Table Offres de crédit
CREATE TABLE IF NOT EXISTS offres_credit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom_banque VARCHAR NOT NULL,
    description VARCHAR,
    categorie_client VARCHAR NOT NULL DEFAULT 'particulier' CHECK (categorie_client IN ('particulier', 'professionnel')),
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    taux_annuel FLOAT NOT NULL,
    duree_min_mois INTEGER NOT NULL,
    duree_max_mois INTEGER NOT NULL,
    frais_dossier_pct FLOAT NOT NULL,
    assurance_pct_an FLOAT NOT NULL,
    montant_max FLOAT NOT NULL
);

-- Table Simulations
CREATE TABLE IF NOT EXISTS simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    offre_id UUID NOT NULL REFERENCES offres_credit(id),
    montant FLOAT NOT NULL,
    duree_mois INTEGER NOT NULL,
    mensualite FLOAT NOT NULL,
    taeg FLOAT NOT NULL,
    cout_total FLOAT NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Messages IA
CREATE TABLE IF NOT EXISTS messages_ia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_id UUID REFERENCES simulations(id),
    type VARCHAR NOT NULL,
    contenu_entree TEXT NOT NULL,
    contenu_reponse TEXT NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_simulations_user_id ON simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_simulations_offre_id ON simulations(offre_id);
CREATE INDEX IF NOT EXISTS idx_messages_ia_simulation_id ON messages_ia(simulation_id);

-- Afficher un message de confirmation
SELECT 'All tables created successfully!' AS status;
