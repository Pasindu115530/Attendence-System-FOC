from flask import Blueprint, request, jsonify
from services.agent_service import run_attendance_agent

agent_bp = Blueprint('agent', __name__)

@agent_bp.route('/chat', methods=['POST'])
def handle_agent_chat():
    data = request.get_json()
    
    if not data or 'message' not in data:
        return jsonify({"error": "Message parameter is required."}), 400
        
    user_message = data.get('message')
    chat_history = data.get('history', []) # Front-end එකෙන් එවනු ලබන array එක
    
    try:
        ai_reply = run_attendance_agent(user_message, chat_history)
        return jsonify({"reply": ai_reply}), 200
    except Exception as e:
        # Logging standard system errors
        return jsonify({"error": str(e)}), 500