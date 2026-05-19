from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types
import os

load_dotenv()

# Initialize the new Gemini client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Create the FastAPI app
app = FastAPI(title="Chatbot SaaS API")

# Allow the React frontend to talk to this backend

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# MOCK USER DATABASE
# Free tier: 10 queries/day | Premium: unlimited

users = {
    "free_user": {"plan": "free", "queries_today": 0, "query_limit": 10},
    "premium_user": {"plan": "premium", "queries_today": 0, "query_limit": 999999},
}


class ChatRequest(BaseModel):
    user_id: str                          # Who is sending the message
    message: str                          # The user's message
    conversation_history: list = []       # Previous messages for context

class ChatResponse(BaseModel):
    reply: str                           
    queries_used: int                     
    query_limit: int                      
    plan: str                             


@app.get("/")
def root():
    """Health check endpoint"""
    return {"status": "Chatbot SaaS API is running!"}


@app.get("/user/{user_id}")
def get_user(user_id: str):
    """Get user plan and usage info"""
    if user_id not in users:
        raise HTTPException(status_code=404, detail="User not found")
    return users[user_id]


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    user_id = request.user_id

    #  Check if user exists
    if user_id not in users:
        raise HTTPException(status_code=404, detail="User not found. Please register.")

    user_data = users[user_id]

    # Check query limit (SaaS subscription enforcement)
    if user_data["queries_today"] >= user_data["query_limit"]:
        raise HTTPException(
            status_code=403,
            detail=f"Query limit reached. Your {user_data['plan']} plan allows {user_data['query_limit']} queries per day."
        )

    # Building full conversation  with history

    user_data["queries_today"] += 1

    try:
    # Send to Gemini using the new google-genai SDK
        chat = client.chats.create(model="gemini-2.5-flash")

        response = chat.send_message(request.message)

        # Step 6: Return the response
        return ChatResponse(
                reply=response.text,
                queries_remaining=user_data["query_limit"] - user_data["queries_today"],
                queries_used=user_data["queries_today"],
                query_limit=user_data["query_limit"],
                plan=user_data["plan"]
            )

    except Exception as e:
        user_data["queries_today"] -= 1
        raise HTTPException(status_code=500, detail=f"AI Service Error: {str(e)}")


@app.post("/reset/{user_id}")
def reset_queries(user_id: str):
    """Reset daily query count (would be automated daily in production)"""
    if user_id not in users:
        raise HTTPException(status_code=404, detail="User not found")
    users[user_id]["queries_today"] = 0
    return {"message": f"Query count reset for {user_id}"}
