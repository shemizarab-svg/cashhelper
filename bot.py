from aiogram import Bot, Dispatcher, types
from aiogram.types import WebAppInfo
import asyncio

TOKEN = "8394466695:AAG2yHnNh1NcTeJLKdfhvNOP3xeMdDLi0zA"

# Ссылка на ваш размещенный HTML (например, на GitHub Pages или Vercel)
# Если тестируете локально, это может быть ngrok ссылка https://xxxx.ngrok.io
WEB_APP_URL = "https://your-site-url.com" 

async def main():
    bot = Bot(token=TOKEN)
    dp = Dispatcher()

    @dp.message(lambda message: message.text == '/start')
    async def start(message: types.Message):
        keyboard = types.InlineKeyboardMarkup(inline_keyboard=[
            [types.InlineKeyboardButton(text="Открыть Казну 💰", web_app=WebAppInfo(url=WEB_APP_URL))]
        ])
        await message.answer("Привет! Открой приложение для управления расходами:", reply_markup=keyboard)

    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())