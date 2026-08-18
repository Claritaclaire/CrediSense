from passlib.context import CryptContext

ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
mot_de_passe = "clarita123"
hash_bcrypt = ctx.hash(mot_de_passe)

print(len(hash_bcrypt))  # doit afficher 60
print(hash_bcrypt)
