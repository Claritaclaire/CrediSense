# Guide de Déploiement : CrediSense sur Render avec TiDB Cloud

Ce guide vous accompagne pas-à-pas pour déployer l'application **CrediSense** en production sur la plateforme **Render** adossée à une base de données managée **TiDB Cloud Serverless** (compatible MySQL).

---

## 1. Création de la Base de Données TiDB Cloud (Gratuit)

1. Rendez-vous sur [https://tidbcloud.com](https://tidbcloud.com) et créez un compte ou connectez-vous.
2. Cliquez sur **Create Cluster** :
   - Choisissez le type **Serverless** (gratuit, jusqu'à 5 Go de stockage et mise à l'échelle automatique).
   - Sélectionnez la région cloud la plus proche (ex. *Frankfurt* ou *Ireland* si vous choisissez l'Europe sur Render).
   - Nommez votre cluster (ex: `credisense-db`).
3. Cliquez sur **Create**.
4. Dans la fenêtre de sécurité :
   - Notez le nom d'utilisateur généré (ex: `xxxx.root`) et le mot de passe généré.
5. Cliquez sur **Connect** > Onglet **General** ou **SQLAlchemy (Python)** :
   - L'URL de connexion est au format :
     ```text
     mysql+pymysql://<UTILISATEUR>:<MOT_DE_PASSE>@<HOTENAME>:4000/<NOM_BASE>?ssl_verify_cert=true&ssl_verify_identity=true
     ```
   - Exemple :
     ```text
     mysql+pymysql://3rabcde.root:MonMotDePasse123@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/credit_simulateur?ssl_verify_cert=true&ssl_verify_identity=true
     ```
   *(Gardez cette URL précieusement, elle sera renseignée dans la variable `DATABASE_URL` sur Render).*

---

## 2. Déploiement sur Render via le Blueprint (Méthode Recommandée)

Le dépôt contient déjà le fichier `render.yaml` qui configure automatiquement les deux services.

1. Poussez vos modifications sur votre dépôt GitHub (`git add .`, `git commit -m "feat: Render & TiDB support"`, `git push`).
2. Connectez-vous sur [https://dashboard.render.com](https://dashboard.render.com).
3. Cliquez sur le bouton **New +** en haut à droite, puis sélectionnez **Blueprint**.
4. Liez votre dépôt GitHub **CrediSense**.
5. Render détecte automatiquement `render.yaml` et prépare deux services :
   - **`credisense-backend`** (Web Service FastAPI)
   - **`credisense-frontend`** (Static Site React)
6. Dans l'écran de configuration du Blueprint :
   - Remplissez `DATABASE_URL` avec votre URL de connexion TiDB Cloud.
   - *(Optionnel)* Remplissez `ANTHROPIC_API_KEY` ou `DIFY_API_KEY` si vous utilisez les services IA externes.
7. Cliquez sur **Apply**.
8. Une fois le backend déployé, notez son URL publique (ex: `https://credisense-backend.onrender.com`).
9. Allez dans les paramètres d'environnement de `credisense-frontend` et mettez la variable `VITE_API_URL` avec cette URL :
   ```text
   VITE_API_URL=https://credisense-backend.onrender.com
   ```
10. Relancez un déploiement du frontend (**Manual Deploy** > **Clear build cache & deploy**).

---

## 3. Alternative : Déploiement Manuel sur Render (Service par Service)

Si vous préférez créer les services manuellement sans Blueprint :

### A. Déploiement du Backend
1. **New +** > **Web Service**.
2. Liez votre dépôt.
3. Paramètres :
   - **Name** : `credisense-backend`
   - **Runtime** : `Python 3`
   - **Region** : Même région que TiDB (ex. *Frankfurt*)
   - **Build Command** :
     ```bash
     pip install -r requirements.txt && python init_db_tidb.py
     ```
   - **Start Command** :
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
4. Variables d'environnement (**Environment Variables**) :
   - `DATABASE_URL` : Votre URL TiDB Cloud (`mysql+pymysql://...`)
   - `SECRET_KEY` : Chaîne aléatoire de 32+ caractères
   - `PYTHON_VERSION` : `3.11.9`
5. Cliquez sur **Create Web Service**.
6. Au premier build, le script `init_db_tidb.py` va se connecter à TiDB, créer les tables et insérer les 6 offres CCA Bank par défaut.

### B. Déploiement du Frontend
1. **New +** > **Static Site**.
2. Liez votre dépôt.
3. Paramètres :
   - **Name** : `credisense-frontend`
   - **Build Command** :
     ```bash
     cd frontend && npm install && npm run build
     ```
   - **Publish Directory** :
     ```text
     frontend/dist
     ```
4. Configuration des redirections (très important pour React Router) :
   - Dans le menu de gauche, cliquez sur **Redirects/Rewrites**.
   - Ajoutez une règle :
     - **Type** : `Rewrite`
     - **Source** : `/*`
     - **Destination** : `/index.html`
5. Variables d'environnement :
   - `VITE_API_URL` : `https://credisense-backend.onrender.com`
6. Cliquez sur **Create Static Site**.

---

## 4. Création du Premier Compte Administrateur en Production

Après le déploiement :
1. Créez un compte client normal depuis l'interface web (`/register`).
2. Sur la console TiDB Cloud (onglet **SQL Editor**) ou via un client SQL connecté à votre base TiDB, exécutez :
   ```sql
   UPDATE users
   SET role = 'admin_systeme'
   WHERE email = 'votre_email@exemple.com';
   ```
3. Déconnectez-vous et reconnectez-vous sur l'application : vous aurez désormais accès à l'onglet **Administration** et **Administration Système** (`/administration-systeme`).

---

## 5. Résumé des Spécificités Techniques TiDB

- **Chiffrement obligatoire** : Le paramètre SSL est géré automatiquement par le fichier `app/database.py` via `ssl_mode: VERIFY_IDENTITY`.
- **Pool de connexions** : `pool_pre_ping=True` et `pool_recycle=300` évitent les erreurs `MySQL server has gone away` courantes sur les bases serverless après quelques minutes d'inactivité.
- **Identifiants UUID universels** : Les clés primaires utilisent `sqlalchemy.Uuid` au lieu des types exclusifs à PostgreSQL, ce qui garantit une portabilité parfaite.
