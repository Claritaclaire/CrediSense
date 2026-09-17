# CrediSense

Plateforme web de simulation, comparaison et demande de crédit pour un environnement bancaire moderne.
CrediSense permet à un client de calculer sa capacité d’emprunt, comparer plusieurs offres, suivre ses demandes et obtenir des explications IA guidées par les règles financières du projet.

## Fonctionnalités

### Espace client

- inscription, connexion et authentification JWT ;
- profil personnel et financier avec revenu, charges et situation actuelle ;
- photo de profil en cliquant directement sur le cadre des initiales ;
- ajout et suivi des prêts en cours ;
- simulation de montant, durée, mensualité, TAEG et coût total ;
- calcul de capacité d’emprunt ;
- comparaison de plusieurs offres ;
- historique des simulations avec détail, graphique et tableau d’amortissement ;
- bouton pour refaire une simulation depuis l’historique ;
- dépôt et suivi des demandes de crédit ;
- notification email côté call center ;
- explication de clauses en langage simple ;
- assistant IA flottant pour répondre aux questions du client ;
- recommandations IA avec mode de secours local ;
- contact call center : +237 679 00 96 30 et callcenter@cca-bank.com.

### Assistant IA flottant

L’assistant est disponible pour les utilisateurs connectés. Il peut :

- expliquer le TAEG et les notions de crédit ;
- répondre aux questions générales sur l’application ;
- estimer une capacité indicative à partir d’un revenu donné dans la question ;
- afficher les réponses avec du texte en gras et des retours à la ligne ;
- utiliser une icône robot intégrée à l’interface.

Les blocs internes de raisonnement envoyés par Dify ou d’autres services IA sont nettoyés côté backend avant l’affichage dans le front.

### Recommandation financière

La recommandation prend en compte :

- le revenu mensuel ;
- les charges mensuelles ;
- les mensualités des prêts en cours ;
- l’apport ;
- le montant et la durée demandés ;
- la quotité cessible légale ;
- la mensualité totale du nouveau crédit, y compris assurance.

Une offre n’est recommandée que si :

```text
mensualité + assurance <= quotité cessible - charges - prêts en cours
```

Le backend effectue les calculs et filtre les offres. Dify ou Claude expliquent ensuite le résultat, sans inventer de taux, de plafond ou de règle bancaire.

## Quotité cessible

Le calcul applique le barème implémenté dans `app/services/calculs_financiers.py` :

- 10 % sur la tranche jusqu’à 18 750 FCFA ;
- 20 % sur la tranche de 18 751 à 37 500 FCFA ;
- 25 % sur la tranche de 37 501 à 75 000 FCFA ;
- 1/3 sur la tranche de 75 001 à 112 500 FCFA ;
- 50 % sur la tranche de 112 501 à 142 500 FCFA ;
- 100 % sur la fraction supérieure à 142 500 FCFA.

La mensualité disponible est ensuite calculée ainsi :

```text
quotité cessible - charges mensuelles - mensualités des prêts en cours
```

Cette évaluation reste indicative et ne constitue pas une décision définitive de la banque.

## Administration

### Admin bancaire

L’espace `/admin` permet notamment de gérer :

- les offres de crédit ;
- les demandes de crédit ;
- les simulations ;
- les utilisateurs ;
- les recommandations IA ;
- la configuration ;
- le journal d’audit.

### Admin système

L’espace `/administration-systeme` est réservé au rôle `admin_systeme`.
Il permet de :

- consulter les statistiques globales ;
- voir le nombre de clients, administrateurs, comptes actifs et inactifs ;
- créer un administrateur bancaire ou un conseiller ;
- renseigner nom, email, téléphone, banque et agence ;
- attribuer des permissions ;
- rechercher un compte ;
- modifier un compte ;
- activer ou désactiver un compte ;
- consulter les activités et la traçabilité.

L’admin système ne gère pas directement les offres ni les comptes clients. Ces responsabilités restent dans l’espace bancaire.

Pour promouvoir un premier compte en admin système, exécuter la migration puis utiliser une commande SQL sur un compte connu :

```sql
UPDATE users
SET role = 'admin_systeme'
WHERE email = 'admin@example.com';
```

## Architecture

```text
CrediSense/
|-- app/
|   |-- core/                 Sécurité et exceptions
|   |-- models/               Modèles SQLAlchemy
|   |-- routers/              Routes FastAPI
|   |-- schemas/              Schémas Pydantic
|   |-- services/             Calculs financiers et IA
|   `-- utils/                Utilitaires email
|-- frontend/
|   `-- src/                  Application React et pages client/admin
|-- tests/                    Tests métier
|-- docs/                     Documentation détaillée
|-- migrate_admin_systeme.py  Migration du rôle admin_systeme
|-- configurer_offres.py      Synchronisation du catalogue
|-- requirements.txt          Dépendances Python
`-- schema.sql                Schéma SQL de référence
```

### Technologies

- Python, FastAPI et Uvicorn ;
- PostgreSQL, SQLAlchemy et Pydantic ;
- JWT et passlib/bcrypt ;
- SciPy pour les calculs numériques ;
- Dify et Anthropic pour les services IA ;
- React, Vite, React Router et Axios ;
- Tailwind CSS.

## Installation

### Prérequis

- Python 3.11 ou plus récent ;
- Node.js et npm ;
- PostgreSQL ;
- une base de données CrediSense ;
- une clé Dify ou Anthropic si l’IA externe est activée.

### Backend

Depuis la racine du projet :

```powershell
python -m pip install -r requirements.txt
python init_db_fixed.py
python migrate_admin_systeme.py
python run_server.py
```

L’API est disponible sur http://127.0.0.1:8000.
La documentation OpenAPI est disponible sur http://127.0.0.1:8000/docs.

Alternative :

```powershell
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

Dans un second terminal :

```powershell
cd frontend
npm install
npm run dev
```

Vite affiche normalement le frontend sur http://localhost:5173.

Pour produire le build :

```powershell
cd frontend
npm run build
```

## Variables d’environnement

Créer un fichier `.env` à la racine. Ne jamais le committer.

```env
DATABASE_URL=postgresql://utilisateur:mot_de_passe@localhost:5432/credit_simulateur
SECRET_KEY=une-cle-secrete-longue-et-aleatoire
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
DIFY_API_KEY=
DIFY_API_URL=https://api.dify.ai/v1

SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
EMAIL_FROM=
SMTP_USE_TLS=true
DEMANDES_EMAIL_DESTINATAIRE=
```

Les clés API, mots de passe SMTP et secrets JWT doivent rester dans `.env` ou dans un gestionnaire de secrets. Toute clé déjà exposée doit être révoquée.

## Routes API principales

```text
POST /auth/register
POST /auth/login
GET  /users/me
PATCH /users/me

GET  /offres/
GET  /offres/{offre_id}
POST /simulations/
POST /simulations/comparer
POST /simulations/capacite
GET  /simulations/historique
GET  /simulations/{simulation_id}

POST /ia/assistant
POST /ia/recommandation
POST /ia/explication-clause

GET  /historique-prets/
POST /historique-prets/
GET  /demandes-credit/mes-demandes
POST /demandes-credit/
```

Routes Admin système :

```text
GET   /admin-systeme/dashboard
GET   /admin-systeme/administrateurs
POST  /admin-systeme/administrateurs
PATCH /admin-systeme/administrateurs/{user_id}
GET   /admin-systeme/activites
```

## Tests

Exécuter les tests métier depuis la racine :

```powershell
python -m pytest -q
```

Les tests couvrent notamment le calcul de quotité cessible et la déduction des charges et des mensualités de prêts existants.

## Données locales du navigateur

Certaines informations client sont actuellement conservées dans le navigateur via `localStorage` :

- profil financier ;
- prêts ajoutés localement ;
- paramètres de simulation ;
- photo de profil compressée.

La photo est redimensionnée avant stockage et reste liée au navigateur utilisé. Pour une version multi-appareils, il faudra migrer ces données vers le backend et un stockage de fichiers sécurisé.

## Sécurité et production

Avant une mise en production :

- restreindre le CORS aux domaines autorisés ;
- remplacer les secrets de développement ;
- protéger les clés Dify, Anthropic et SMTP ;
- valider officiellement le barème et les conditions de CCA Bank ;
- stocker le profil financier côté serveur si la synchronisation multi-appareils est nécessaire ;
- ajouter une rotation et une expiration adaptées des tokens ;
- vérifier les permissions de chaque route admin ;
- conserver les journaux d’audit dans un stockage protégé ;
- ne jamais considérer une recommandation IA comme une décision de crédit.

Documentation complémentaire :
[docs/GUIDE_APPLICATION_CREDISENSE.md](docs/GUIDE_APPLICATION_CREDISENSE.md)
