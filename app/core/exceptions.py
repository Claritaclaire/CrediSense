from fastapi import HTTPException, status


class OffreNonTrouveeException(HTTPException):
    def __init__(self):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail="Offre de crédit introuvable")


class MontantHorsLimitesException(HTTPException):
    def __init__(self, montant_max: float):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Le montant demandé dépasse le plafond autorisé ({montant_max} FCFA)",
        )


class DureeHorsLimitesException(HTTPException):
    def __init__(self, duree_min: int, duree_max: int):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La durée doit être comprise entre {duree_min} et {duree_max} mois",
        )


class SimulationNonTrouveeException(HTTPException):
    def __init__(self):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation introuvable")
