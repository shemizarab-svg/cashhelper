import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton

TOKEN = "8394466695:AAG2yHnNh1NcTeJLKdfhvNOP3xeMdDLi0zA"

# Ссылка на ваш размещенный HTML (например, на GitHub Pages или Vercel)
# Если тестируете локально, это может быть ngrok ссылка https://xxxx.ngrok.io
WEB_APP_URL = "https://shemizarab-svg.github.io/cashhelper/webapp/" 

bot = Bot(token=TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def start_handler(message: types.Message):
    # Создаем кнопку, которая открывает Web App
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💰 Открыть Казну (Open Budget)", web_app=WebAppInfo(url=WEB_APP_URL))]
    ])
    
    await message.answer(
        "Привет! Нажми на кнопку ниже, чтобы открыть приложение:",
        reply_markup=keyboard
    )

async def main():
    print("Бот запущен...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())