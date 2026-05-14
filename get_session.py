import asyncio, os
from telethon import TelegramClient
from telethon.sessions import StringSession

API_ID = 33411598
API_HASH = 'ed533c055299ed7c7ecd250f8c64bb4d'

async def main():
    client = TelegramClient('minha_sessao', API_ID, API_HASH)
    await client.start(phone='+5531987870330')
    from telethon.sessions import StringSession
    session_str = StringSession.save(client.session)
    print('\n\n=== SUA SESSION STRING ===')
    print(session_str)
    print('=== FIM ===\n')
    await client.disconnect()

asyncio.run(main())
