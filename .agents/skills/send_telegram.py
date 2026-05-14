#!/usr/bin/env python3
"""
Skill: send_telegram
Envia mensagem via Telethon para as Mensagens Salvas de Jonathan
Uso: python3 send_telegram.py "Texto da mensagem"
"""
import asyncio, os, sys

async def main():
    try:
        from telethon import TelegramClient
        from telethon.sessions import StringSession
    except ImportError:
        os.system('pip install telethon -q')
        from telethon import TelegramClient
        from telethon.sessions import StringSession

    API_ID = int(os.environ.get('TELEGRAM_API_ID', '0'))
    API_HASH = os.environ.get('TELEGRAM_API_HASH', '')
    SESSION = os.environ.get('TELEGRAM_SESSION_STRING', '')

    msg = ' '.join(sys.argv[1:]) if len(sys.argv) > 1 else 'Mensagem de teste do Estúdio Los Hombres'

    client = TelegramClient(StringSession(SESSION), API_ID, API_HASH)
    await client.connect()
    await client.send_message('me', msg)
    print('✅ Mensagem enviada para Mensagens Salvas!')
    await client.disconnect()

asyncio.run(main())
