import os, threading, json

from db import *

from flask import *
from flask_bcrypt import Bcrypt
from flask_mail import Mail, Message as MailMessage
from flask_login import (
	LoginManager, logout_user,
	login_required, current_user
)
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

from wtforms import *
from wtforms.validators import *

# Flask app configuration:
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SECRET_KEY'] = 'hugoguh12321'

# Configure Flask-Mail
app.config.update(
	MAIL_SERVER="smtp.gmail.com",
	MAIL_PORT=587,
	MAIL_USE_TLS=True,
	MAIL_USERNAME="miiaudote@gmail.com",
	MAIL_PASSWORD="czha ghtd gxjk mhbz"
)

# Create Instances
mail = Mail(app)
bcrypt = Bcrypt(app)
url_serializer = URLSafeTimedSerializer(app.secret_key)

login_manager = LoginManager()
login_manager.login_view = 'login'

db.init_app(app)
login_manager.init_app(app)

# Required Folders
for folder in ['uploads/profile_pictures', 'uploads/posts']:
	os.makedirs(folder, exist_ok=True)

# Helper Functions
@login_manager.user_loader
def load_user(user_id):
	return db.session.get(User, int(user_id))

def send_async_email(app, msg):
	with app.app_context():
		mail.send(msg)

def verify_email():
	token = url_serializer.dumps(current_user.email, salt="email-confirm")
	link = url_for("confirm_email", token=token, _external=True)
	  
	msg = MailMessage("Reenvio: Confirme seu email", sender=app.config["MAIL_USERNAME"], recipients=[current_user.email])
	msg.body = f"Clique aqui para verificar sua conta: {link}"
	
	thr = threading.Thread(target=send_async_email, args=(current_app._get_current_object(), msg))
	thr.start()

# Import the Forms for the Routes
from forms import *

# Register Routes
@app.route('/')
def home():
	return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
	login_form = LoginForm()

	if login_form.validate_on_submit():
		login_form.on_submit()
		if current_user.verified:
			return redirect(url_for('dashboard'))
		else:
			return redirect(url_for('verify'))
	return render_template('login.html', login_form=login_form)

@app.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
	logout_user()
	return redirect(url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
	register_form = RegisterForm()

	if register_form.validate_on_submit():
		user = register_form.on_submit()
		db.session.add(user)
		db.session.commit()
		return redirect(url_for('login'))
	return render_template('register.html', register_form=register_form)

@app.route('/messenger/<id>', methods=['GET', 'POST'])
@login_required
def messenger(id):
	post_form = PostForm()

	existing_user = db.session.execute(db.select(User).filter_by(id=id)).scalar_one_or_none()
	if existing_user is None:
		return redirect(url_for('dashboard'))
	if post_form.validate_on_submit():
		post_form.on_submit()
		return redirect(url_for('dashboard', id=id))
	return render_template('messenger.html', post_form=post_form)

@app.route('/profile/<id>', methods=['GET', 'POST'])
@login_required
def profile(id):
	profile_form = ProfileForm()
	post_form = PostForm()

	if profile_form.validate_on_submit() and current_user.id == int(id):
		profile_form.on_submit(id)
		return redirect(url_for('profile', id=id))
	if post_form.validate_on_submit():
		post_form.on_submit()
		return redirect(url_for('dashboard', id=id))

	existing_user = db.session.execute(db.select(User).filter_by(id=id)).scalar_one_or_none()
	if existing_user is None:
		return redirect(url_for('dashboard'))

	profile = existing_user.to_dict()
	return render_template('profile.html', profile=profile, profile_form=profile_form, post_form=post_form)

@app.route('/dashboard', methods=['GET', 'POST'])
@login_required
def dashboard():
	post_form = PostForm()

	if post_form.validate_on_submit():
		post_form.on_submit()
		return redirect(url_for('dashboard'))
	return render_template('dashboard.html', post_form=post_form)

@app.route('/verify', methods=['GET', 'POST'])
@login_required
def verify():
	verify_form = VerifyForm()

	if verify_form.is_submitted():
		return redirect(url_for('verify'))
	else:
		verify_email()
		return render_template('verify.html', verify_form=verify_form)

@app.route('/manifest.json', methods=['GET'])
def serve_manifest():
	return send_file('manifest.json', mimetype='application/manifest+json')

@app.route('/api/posts', methods=['GET'])
def posts():
	posts = db.session.execute(db.select(Post)).scalars().all()
	retrieved_info = [post.to_dict() for post in posts]
	return jsonify(retrieved_info)

@app.route('/api/posts/delete', methods=['POST'])
@login_required
def delete_post():
	id = request.json.get("id")
	post = db.session.execute(db.select(Post).filter_by(id=id)).scalars().first()

	if post is None:
		return redirect(url_for('dashboard'))
	if post.user_id != current_user.id:
		return redirect(url_for('dashboard'))
	
	db.session.delete(post)
	db.session.commit()

	for image in json.loads(post.images):
		os.remove(os.path.join('uploads', 'posts', image))
	return "success"

@app.route('/api/search/<query>', methods=['GET'])
def search(query):
	users = db.session.execute(db.select(User).filter(User.username.ilike(f'%{query}%'))).scalars().all()
	retrieved_info = [{
		'id': user.id,
		'username': user.username
	} for user in users]
	return jsonify(retrieved_info)

@app.route('/api/uploads/<path:subpath>/<filename>', methods=['GET'])
def get_file(subpath, filename):
	directory = os.path.join('Uploads', subpath)
	file_path = os.path.join(directory, filename)

	if os.path.exists(file_path):
		return send_from_directory(directory, filename)
	if os.path.normpath(directory) == os.path.normpath('Uploads/profile_pictures'):
		fallback_dir = os.path.join('static', 'images')
		fallback_filename = 'user_default.png'
		return send_from_directory(fallback_dir, fallback_filename)

@app.route('/api/current_user', methods=['GET'])
def serve_session():
	return jsonify(current_user.to_dict())

@app.route('/api/user/<id>', methods=['GET'])
def serve_user(id):
	existing_user = db.session.execute(db.select(User).filter_by(id=id)).scalar_one_or_none()
	if existing_user is None:
		return json.dumps([])
	return jsonify(existing_user.to_dict())

@app.route('/api/messenger/request/<int:sender>/<int:recipient>', methods=['GET'])
def serve_message(sender, recipient):
	messages = db.session.execute(db.select(Message).filter_by(sender_id=sender, recipient_id=recipient)).scalars()
	formatted_messages = []

	if messages is None:
		return "error"
	for message in messages:
		formatted_messages.append(message.to_dict())
	return jsonify(formatted_messages)

@app.route('/api/messenger/send', methods=['POST'])
@login_required
def send_message():
	content = request.json.get("content")
	sender_id = request.json.get("sender")
	recipient_id = request.json.get("recipient")

	sender_user = db.session.execute(db.select(User).filter_by(id=sender_id)).scalar_one_or_none()
	recipient_user = db.session.execute(db.select(User).filter_by(id=recipient_id)).scalar_one_or_none()

	if content is None or content == "":
		return "error"
	if sender_user is None or recipient_user is None:
		return "error"
	if sender_user.id == recipient_user.id:
		return "error"
	if sender_user.id != current_user.id:
		return "unauthorized"

	new_message = Message(
		sender_id=sender_user.id,
		recipient_id=recipient_user.id,
		content=content
	)
	sender_contacts = json.loads(sender_user.contacts or "[]")
	recipient_contacts = json.loads(recipient_user.contacts or "[]")

	if recipient_id not in sender_contacts:
		sender_contacts.append(recipient_id)
	if sender_id not in recipient_contacts:
		recipient_contacts.append(sender_id)

	sender_user.contacts = json.dumps(sender_contacts)
	recipient_user.contacts = json.dumps(recipient_contacts)

	db.session.add(new_message)
	db.session.commit()
	return "success"

@app.route("/api/verify/<token>")
def confirm_email(token):
	try:
		email = url_serializer.loads(token, salt="email-confirm", max_age=3600)
	except SignatureExpired:
		return "O link expirou, faça o registro novamente."
	except BadSignature:
		return "Link inválido!"
	user = db.session.execute(db.select(User).filter_by(email=email)).scalar_one_or_none()
	if user is None:
		return redirect(url_for("register"))
	if user.verified:
		return redirect(url_for("login"))
	user.verified = True
	db.session.commit()
	return redirect(url_for("login"))

# Run the App
if __name__ == '__main__':
	# Create database if necessary:
	with app.app_context():
		db.create_all()
	app.run(debug=True)