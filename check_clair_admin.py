from app.database import SessionLocal
from app.models.user import User, RoleUtilisateur
from passlib.context import CryptContext

# Initialize
db = SessionLocal()
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

try:
    # Check the user
    email = 'clar@gmail.com'
    user = db.query(User).filter(User.email == email).first()

    if user is None:
        print('❌ ERREUR: Utilisateur clar@gmail.com INTROUVABLE dans la base de données')
        print('   Cet utilisateur n\'existe pas du tout.')
    else:
        print('✅ Utilisateur trouvé:')
        print('   Email: {}'.format(user.email))
        print('   Nom: {}'.format(user.nom))
        print('   Role stocké en base: {}'.format(user.role))
        print('   Type du role: {}'.format(type(user.role).__name__))

        # Get role value safely
        if hasattr(user.role, 'value'):
            role_value = user.role.value
        else:
            role_value = str(user.role)
        print('   Valeur du role: {}'.format(role_value))

        # Check if it's admin
        is_admin = user.role == RoleUtilisateur.admin
        print('   Est-ce un administrateur ?: {}'.format(is_admin))

        if not is_admin:
            print('   ⚠️  CE N\'EST PAS UN ADMIN - C\'EST POURQUOI L\'ACCÈS EST REFUSÉ')
            print('   → Solution: Mettre à jour le rôle en base')
            print('      UPDATE users SET role = \'admin\' WHERE email = \'{}\';'.format(email))
        else:
            print('   ✅ ROLE ADMIN CONFIRMÉ EN BASE')

            # Optional: password verification
            password = 'clarita123'
            if pwd_context.verify(password, user.password_hash):
                print('   ✅ Mot de passe vérifié CORRECT')

                # Try to simulate what the API would see
                from app.core.security import creer_access_token
                from app.config import settings
                from datetime import datetime, timedelta, timezone

                access_token = creer_access_token(data={'sub': str(user.id)})
                print('   ✅ Token d\'accès généré avec succès')

                # Decode token to see what it contains
                import base64, json
                token_parts = access_token.split('.')
                payload = token_parts[1]
                padding = 4 - len(payload) % 4
                if padding != 4:
                    payload += '=' * padding
                decoded = base64.urlsafe_b64decode(payload)
                payload_data = json.loads(decoded)
                print('   Contenu du token: {}'.format(payload_data))

                # Check role in token (should be there via user object in get_current_user)
                # Actually, the token only has sub (user ID), role is fetched from DB on each request
                print('   → Le rôle sera vérifié en base à chaque requête via get_current_user')

            else:
                print('   ❌ Mot de passe INCORRECT pour cet utilisateur')
                print('   → Vérifiez que clarita123 est bien le mot de passe associé à cet email')

finally:
    db.close()
    print('')
    print('🔒 Connexion à la base de données fermée.')