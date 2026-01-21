from fastapi import APIRouter
from app.api.routes.auth import router as auth
from app.api.routes.setup import router as setup
from app.api.routes.admin import router as admin
from app.api.routes.servers import router as servers
from app.api.routes.rooms import router as rooms
from app.api.routes.games import router as games

api_router = APIRouter()
api_router.include_router(setup)
api_router.include_router(auth)
api_router.include_router(admin)
api_router.include_router(servers)
api_router.include_router(rooms)
api_router.include_router(games)
