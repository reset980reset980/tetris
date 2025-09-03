#!/usr/bin/env python3
"""
Tetris Multiplayer Server
WebSocket-based multiplayer server for Tetris Battle game
Supports room creation, joining, quick match, and real-time gameplay synchronization
"""

import asyncio
import json
import logging
import uuid
import time
from typing import Dict, Set, Optional
import websockets
import websockets.exceptions

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Server configuration
HOST = "0.0.0.0"  # Listen on all interfaces
PORT = 9003

class Player:
    """Represents a connected player"""
    
    def __init__(self, websocket, player_id: str):
        self.websocket = websocket
        self.id = player_id
        self.name = f"Player {player_id[-4:]}"
        self.room_id: Optional[str] = None
        self.is_ready = False
        self.game_state = {
            "board": [[0 for _ in range(10)] for _ in range(20)],
            "score": 0,
            "level": 1,
            "lines": 0,
            "combo": 0,
            "items": []
        }
        self.last_heartbeat = time.time()

class Room:
    """Represents a game room"""
    
    def __init__(self, room_id: str, max_players: int = 4):
        self.id = room_id
        self.max_players = max_players
        self.players: Dict[str, Player] = {}
        self.host_id: Optional[str] = None
        self.game_started = False
        self.game_settings = {
            "itemsEnabled": True,
            "startLevel": 1,
            "gameMode": "battle"
        }
        self.created_at = time.time()

    def add_player(self, player: Player) -> bool:
        """Add player to room"""
        if len(self.players) >= self.max_players:
            return False
        
        self.players[player.id] = player
        player.room_id = self.id
        
        if self.host_id is None:
            self.host_id = player.id
            
        return True

    def remove_player(self, player_id: str):
        """Remove player from room"""
        if player_id in self.players:
            del self.players[player_id]
            
        # Transfer host if needed
        if self.host_id == player_id and self.players:
            self.host_id = next(iter(self.players.keys()))

    def get_player_data(self):
        """Get serializable player data"""
        return [
            {
                "id": player.id,
                "name": player.name,
                "isReady": player.is_ready,
                "isHost": player.id == self.host_id
            }
            for player in self.players.values()
        ]

class TetrisServer:
    """Main server class handling WebSocket connections and game logic"""
    
    def __init__(self):
        self.players: Dict[str, Player] = {}
        self.rooms: Dict[str, Room] = {}
        self.waiting_players: Set[str] = set()  # For quick match
        
    async def register_player(self, websocket, path):
        """Register a new player connection"""
        player_id = str(uuid.uuid4())
        player = Player(websocket, player_id)
        self.players[player_id] = player
        
        logger.info(f"Player {player_id} connected")
        
        try:
            await self.handle_player_messages(player)
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Player {player_id} disconnected")
        except Exception as e:
            logger.error(f"Error handling player {player_id}: {e}")
        finally:
            await self.cleanup_player(player)

    async def handle_player_messages(self, player: Player):
        """Handle messages from a player"""
        async for message in player.websocket:
            try:
                data = json.loads(message)
                await self.process_message(player, data)
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON from player {player.id}")
                await self.send_error(player, "Invalid message format")
            except Exception as e:
                logger.error(f"Error processing message from {player.id}: {e}")

    async def process_message(self, player: Player, data: dict):
        """Process different message types"""
        message_type = data.get("type")
        
        if message_type == "CREATE_ROOM":
            await self.handle_create_room(player, data)
        elif message_type == "JOIN_ROOM":
            await self.handle_join_room(player, data)
        elif message_type == "QUICK_MATCH":
            await self.handle_quick_match(player)
        elif message_type == "START_GAME":
            await self.handle_start_game(player, data)
        elif message_type == "GAME_STATE":
            await self.handle_game_state(player, data)
        elif message_type == "ATTACK":
            await self.handle_attack(player, data)
        elif message_type == "ITEM_USED":
            await self.handle_item_used(player, data)
        elif message_type == "GAME_OVER":
            await self.handle_game_over(player, data)
        elif message_type == "REJOIN_ROOM":
            await self.handle_rejoin_room(player, data)
        else:
            logger.warning(f"Unknown message type: {message_type}")

    async def handle_create_room(self, player: Player, data: dict):
        """Handle room creation"""
        max_players = data.get("maxPlayers", 4)
        room_id = f"ROOM_{str(uuid.uuid4())[:8].upper()}"
        
        room = Room(room_id, max_players)
        room.game_settings.update(data.get("settings", {}))
        
        if room.add_player(player):
            self.rooms[room_id] = room
            
            await self.send_message(player, "ROOM_CREATED", {
                "roomId": room_id,
                "playerId": player.id,
                "maxPlayers": max_players,
                "players": room.get_player_data()
            })
            
            logger.info(f"Room {room_id} created by player {player.id}")
        else:
            await self.send_error(player, "Failed to create room")

    async def handle_join_room(self, player: Player, data: dict):
        """Handle room joining"""
        room_id = data.get("roomId")
        
        if room_id not in self.rooms:
            await self.send_error(player, "Room not found", "ROOM_ERROR")
            return
            
        room = self.rooms[room_id]
        
        if room.add_player(player):
            await self.send_message(player, "ROOM_JOINED", {
                "roomId": room_id,
                "playerId": player.id,
                "players": room.get_player_data()
            })
            
            # Notify other players
            await self.broadcast_to_room(room_id, "PLAYER_JOINED", {
                "playerId": player.id,
                "playerInfo": {
                    "id": player.id,
                    "name": player.name,
                    "isReady": player.is_ready
                }
            }, exclude=player.id)
            
            logger.info(f"Player {player.id} joined room {room_id}")
        else:
            await self.send_error(player, "Room is full", "ROOM_ERROR")

    async def handle_quick_match(self, player: Player):
        """Handle quick match - find or create a suitable room"""
        # Look for available rooms
        available_room = None
        for room in self.rooms.values():
            if len(room.players) < room.max_players and not room.game_started:
                available_room = room
                break
        
        if available_room:
            # Join existing room
            await self.handle_join_room(player, {"roomId": available_room.id})
            
            await self.send_message(player, "MATCH_FOUND", {
                "roomId": available_room.id,
                "playerId": player.id,
                "players": available_room.get_player_data()
            })
        else:
            # Create new room for quick match
            max_players = 4
            room_id = f"ROOM_{str(uuid.uuid4())[:8].upper()}"
            
            room = Room(room_id, max_players)
            
            if room.add_player(player):
                self.rooms[room_id] = room
                
                await self.send_message(player, "MATCH_FOUND", {
                    "roomId": room_id,
                    "playerId": player.id,
                    "maxPlayers": max_players,
                    "players": room.get_player_data()
                })
                
                logger.info(f"Quick match room {room_id} created for player {player.id}")
            else:
                await self.send_error(player, "Failed to create quick match room")

    async def handle_start_game(self, player: Player, data: dict):
        """Handle game start (host only)"""
        room_id = data.get("roomId")
        
        if room_id not in self.rooms:
            await self.send_error(player, "Room not found")
            return
            
        room = self.rooms[room_id]
        
        if room.host_id != player.id:
            await self.send_error(player, "Only host can start the game")
            return
            
        room.game_started = True
        
        # Broadcast game start
        await self.broadcast_to_room(room_id, "GAME_STARTED", {
            "seed": int(time.time() * 1000),  # Random seed for consistent piece sequence
            "players": room.get_player_data()
        })
        
        logger.info(f"Game started in room {room_id}")

    async def handle_game_state(self, player: Player, data: dict):
        """Handle game state updates"""
        room_id = data.get("roomId")
        state = data.get("state", {})
        
        if room_id in self.rooms:
            player.game_state.update(state)
            
            # Broadcast state to other players in room
            await self.broadcast_to_room(room_id, "GAME_STATE_UPDATE", {
                "playerId": player.id,
                "state": state
            }, exclude=player.id)

    async def handle_attack(self, player: Player, data: dict):
        """Handle attack between players"""
        room_id = data.get("roomId")
        target_id = data.get("target")
        attack_data = data.get("attack", {})
        
        if room_id in self.rooms:
            if target_id == "all":
                # Attack all other players
                await self.broadcast_to_room(room_id, "ATTACK_RECEIVED", {
                    "from": player.id,
                    "attack": attack_data
                }, exclude=player.id)
            else:
                # Attack specific player
                target_player = self.players.get(target_id)
                if target_player:
                    await self.send_message(target_player, "ATTACK_RECEIVED", {
                        "from": player.id,
                        "attack": attack_data
                    })

    async def handle_item_used(self, player: Player, data: dict):
        """Handle item usage"""
        room_id = data.get("roomId")
        item_type = data.get("item")
        target_id = data.get("target")
        
        if room_id in self.rooms:
            # Broadcast item effect
            await self.broadcast_to_room(room_id, "ITEM_EFFECT", {
                "from": player.id,
                "item": item_type,
                "target": target_id
            }, exclude=player.id)

    async def handle_game_over(self, player: Player, data: dict):
        """Handle game over"""
        room_id = data.get("roomId")
        
        if room_id in self.rooms:
            await self.broadcast_to_room(room_id, "PLAYER_ELIMINATED", {
                "playerId": player.id,
                "finalScore": player.game_state.get("score", 0)
            }, exclude=player.id)

    async def handle_rejoin_room(self, player: Player, data: dict):
        """Handle player rejoining after disconnection"""
        room_id = data.get("roomId")
        old_player_id = data.get("playerId")
        
        if room_id in self.rooms:
            room = self.rooms[room_id]
            if old_player_id in room.players:
                # Remove old player reference
                del room.players[old_player_id]
                
            # Add player back
            room.add_player(player)
            
            await self.send_message(player, "REJOINED", {
                "roomId": room_id,
                "players": room.get_player_data()
            })

    async def send_message(self, player: Player, message_type: str, data: dict):
        """Send message to a specific player"""
        try:
            message = {
                "type": message_type,
                "data": data
            }
            await player.websocket.send(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send message to {player.id}: {e}")

    async def send_error(self, player: Player, error_message: str, error_type: str = "ERROR"):
        """Send error message to player"""
        await self.send_message(player, error_type, {
            "error": error_message,
            "timestamp": time.time()
        })

    async def broadcast_to_room(self, room_id: str, message_type: str, data: dict, exclude: str = None):
        """Broadcast message to all players in a room"""
        if room_id not in self.rooms:
            return
            
        room = self.rooms[room_id]
        tasks = []
        
        for player_id, player in room.players.items():
            if player_id != exclude:
                tasks.append(self.send_message(player, message_type, data))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def cleanup_player(self, player: Player):
        """Clean up player data when disconnecting"""
        # Remove from players dict
        if player.id in self.players:
            del self.players[player.id]
        
        # Remove from waiting queue
        if player.id in self.waiting_players:
            self.waiting_players.remove(player.id)
        
        # Handle room cleanup
        if player.room_id:
            room = self.rooms.get(player.room_id)
            if room:
                room.remove_player(player.id)
                
                # Notify other players
                await self.broadcast_to_room(player.room_id, "PLAYER_LEFT", {
                    "playerId": player.id
                })
                
                # Remove empty rooms
                if not room.players:
                    del self.rooms[player.room_id]
                    logger.info(f"Room {player.room_id} deleted (empty)")

    async def cleanup_empty_rooms(self):
        """Periodic cleanup of empty or old rooms"""
        current_time = time.time()
        rooms_to_delete = []
        
        for room_id, room in self.rooms.items():
            # Delete empty rooms or rooms older than 4 hours
            if not room.players or (current_time - room.created_at) > 14400:
                rooms_to_delete.append(room_id)
        
        for room_id in rooms_to_delete:
            del self.rooms[room_id]
            logger.info(f"Room {room_id} cleaned up")

    async def start_server(self):
        """Start the WebSocket server"""
        logger.info(f"Starting Tetris Multiplayer Server on {HOST}:{PORT}")
        
        # Start cleanup task
        asyncio.create_task(self.periodic_cleanup())
        
        # Start WebSocket server
        async with websockets.serve(self.register_player, HOST, PORT):
            logger.info("Server is ready for connections!")
            await asyncio.Future()  # Run forever

    async def periodic_cleanup(self):
        """Periodic maintenance tasks"""
        while True:
            await asyncio.sleep(300)  # Run every 5 minutes
            await self.cleanup_empty_rooms()
            logger.info(f"Server status - Players: {len(self.players)}, Rooms: {len(self.rooms)}")

def main():
    """Main entry point"""
    server = TetrisServer()
    
    try:
        asyncio.run(server.start_server())
    except KeyboardInterrupt:
        logger.info("Server shutting down...")
    except Exception as e:
        logger.error(f"Server error: {e}")

if __name__ == "__main__":
    main()