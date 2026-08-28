# CrediSense

Application web de simulation, comparaison et demande de credit pour la CCA Bank.

## Fonctionnalites

- Consultation du catalogue des offres de credit
- Detail et description de chaque offre
- Inscription et connexion des clients
- Profil financier : revenu, charges, profession, projet et apport
- Simulation de montant et de duree
- Calcul de mensualite, TAEG et cout total
- Comparaison de plusieurs offres
- Evaluation indicative du taux d'endettement
- Recommandation IA et mode local de secours
- Explication de clauses en langage simple
- Depot et suivi des demandes de credit
- Notification email du call center
- Bouton fixe de contact : `+237 679 00 96 30` et `callcenter@cca-bank.com`
- Espace administration pour les demandes, simulations, offres, utilisateurs, IA, configuration et audit

## Parcours client

```text
Inscription
  -> Profil financier
  -> Simulation
  -> Analyse de capacite
  -> Comparaison
  -> Demande de credit
  -> Notification du call center
```

Le profil financier sert notamment a estimer le taux d'endettement :

```text
(charges fixes + mensualites des prets existants + nouvelle mensualite)
/ revenu mensuel x 100
```

Le seuil indicatif actuel est de 33 %. Cette estimation ne remplace pas la decision de la banque.

## Calculs et confidentialite

Les interets sont conserves dans les calculs internes afin de produire une mensualite, un TAEG et un cout total corrects. Ils ne sont pas affiches dans les vues et exports client. Les informations detaillees restent disponibles dans les vues internes d'administration.

## Email des demandes

Lorsqu'une demande est deposee, elle est enregistree en base et une notification est envoyee en arriere-plan.

Le message contient le nom et l'email du client, la reference de demande, le montant, la duree, l'apport, le motif et le statut.

Configuration de test dans `.env` :

```env
DEMANDES_EMAIL_DESTINATAIRE=votre-adresse-de-test@example.com
```

Configuration de production :

```env
DEMANDES_EMAIL_DESTINATAIRE=callcenter@cca-bank.com
```

Ne mettez jamais de mot de passe SMTP, de cle Anthropic ou de cle secrete dans cette documentation. Les secrets doivent rester dans `.env` ou un gestionnaire de secrets. Les secrets deja exposes doivent etre revoques et regeneres.

## Architecture

### Backend

- Python, FastAPI et Uvicorn
- SQLAlchemy et PostgreSQL
- Pydantic pour les schemas API
- JWT pour l'authentification
- SMTP pour les emails
- SciPy pour les calculs numeriques
- Anthropic pour la recommandation IA

### Frontend

- React
- Vite
- React Router
- Axios
- Tailwind CSS

### Dossiers principaux

```text
app/models       Modeles de donnees
app/schemas      Schemas API
app/routers      Routes backend
app/services     Calculs financiers et IA
app/utils        Utilitaires, dont email
frontend/src     Pages et composants React
configurer_offres.py  Synchronisation du catalogue
schema.sql       Structure SQL de reference
docs/            Documentation detaillee
```

## Routes principales

```text
POST /auth/register
POST /auth/login
GET  /users/me
GET  /offres/
GET  /offres/{id}
POST /simulations/
POST /simulations/comparer
GET  /simulations/historique
POST /ia/recommandation
POST /ia/explication-clause
POST /demandes-credit/
GET  /demandes-credit/mes-demandes
GET  /historique-prets/
```

Les routes d'administration sont reservees aux roles autorises et commencent principalement par `/admin/`.

## Installation et lancement

### Backend

```powershell
cd credit-simulateur
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

Dans un autre terminal :

```powershell
cd credit-simulateur/frontend
npm install
npm run dev
```

L'API est disponible sur `http://127.0.0.1:8000`. Vite affiche l'URL du frontend, habituellement `http://localhost:5173`.

## Points a surveiller avant production

- Le profil financier est actuellement conserve dans le navigateur.
- Le revenu n'est pas encore enregistre directement avec chaque simulation.
- Le CORS doit etre restreint aux domaines autorises.
- Les secrets doivent etre geres hors du depot Git.
- Les tests d'envoi email et de depot de demande doivent etre maintenus.
- Les regles bancaires definitives doivent etre validees par la CCA Bank.

Pour une description plus complete, consulter [docs/GUIDE_APPLICATION_CREDISENSE.md](docs/GUIDE_APPLICATION_CREDISENSE.md).
