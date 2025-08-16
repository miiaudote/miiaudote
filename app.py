import os, json, uuid

from flask import *
from flask_login import *

from flask_mail import Mail, Message as MailMessage
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

from flask_wtf import FlaskForm
from flask_wtf.file import MultipleFileField, FileRequired, FileAllowed

from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy

from wtforms import *
from wtforms.validators import *

from dataclasses import dataclass
import phonenumbers

# Database and flask app:
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

app.app_context().push()

mail = Mail(app)
bcrypt = Bcrypt(app)
db = SQLAlchemy()
db.init_app(app)

url_serializer = URLSafeTimedSerializer(app.secret_key)

# Database code

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
	return db.session.get(User, int(user_id))

# User table:
class User(db.Model, UserMixin):
	# Necessary for foreign key
	__tablename__ = 'users'

	id: int = db.Column(db.Integer, primary_key=True)

	username: str = db.Column(db.String(100), nullable=False)
	email: str = db.Column(db.String(100), nullable=False, unique=True)
	password: str = db.Column(db.String(100), nullable=False)
	phone: str = db.Column(db.String(13), nullable=False)

	# User contacts, if never spoken to anyone, empty array.
	contacts = db.Column(db.JSON, nullable=False, default='[]')
	verified: bool = db.Column(db.Boolean, nullable=False, default=False)

  	# Relationships
	posts = db.relationship('Post', back_populates='user')
	sent_messages = db.relationship('Message', foreign_keys='Message.senderId', back_populates='sender')
	received_messages = db.relationship('Message', foreign_keys='Message.recipientId', back_populates='recipient')

	def _to_dict(self):
		return {
			'id': self.id,
			'email': self.email,
			'username': self.username,
			'phone': self.phone,
			'contacts': json.loads(self.contacts),
			'verified': self.verified
		}

# Posts table:
@dataclass
class Post(db.Model):
	__tablename__ = 'posts'

	# Post Attributes
	id: int = db.Column(db.Integer, primary_key=True)
	userId: int = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

	location: str = db.Column(db.String(100), nullable=False)
	images: str = db.Column(db.JSON, nullable=False)

	# Pet Attributes
	petName: str = db.Column(db.String(100), nullable=False)
	petRace: str = db.Column(db.String(100), nullable=False)
	petAge: int = db.Column(db.Integer, nullable=False)
	petSex: str = db.Column(db.String(2), nullable=False)
	petSize: str = db.Column(db.String(100), nullable=False)
	petDescription: str = db.Column(db.String(500), nullable=False)

	user = db.relationship('User', back_populates='posts')

	def _to_dict(self):
		return {
			"id": self.id,
			"petName": self.petName,
			"location": self.location,
			"images": self.images,
			"petRace": self.petRace,
			"petAge": self.petAge,
			"petSex": self.petSex,
			"petSize": self.petSize,
			"petDescription": self.petDescription,
			"userId": self.userId,
			"username": self.user.username
		}
	
# Messages table:
@dataclass
class Message(db.Model):
	__tablename__ = 'messages'

	# Post Attributes
	id: int = db.Column(db.Integer, primary_key=True)
	senderId: int = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
	recipientId: int = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
	content: str = db.Column(db.String(500), nullable=False)

	sender = db.relationship('User', foreign_keys=[senderId], back_populates='sent_messages')
	recipient = db.relationship('User', foreign_keys=[recipientId], back_populates='received_messages')

	def _to_dict(self):
		return {
			"id": self.id,
			"senderId": self.senderId,
			"recipientId": self.recipientId,
			"content": self.content
		}
	
# Register form
# Table insertion:
class RegisterForm(FlaskForm):
	username = StringField(validators=[InputRequired(), Length(min=8, max=100)])
	email = EmailField('Endereço de Email', [InputRequired(), validators.Email()])
	phone = StringField('Número de Telefone', validators=[InputRequired(), Length(min=11, max=11)])
	password = PasswordField(validators=[InputRequired(), Length(min=8, max=100)])
	
	submit = SubmitField("Registrar")

	def validate_email(self, email):
		existing_user = db.session.execute(db.select(User).filter_by(email=email.data)).scalar_one_or_none()
		if existing_user:
			raise ValidationError("Esse usuário já existe!")
		return

	def validate_phone(self, phone):
		try:
			parsed = phonenumbers.parse(phone.data, "BR")
			if not phonenumbers.is_valid_number(parsed):
				raise ValueError()
			self.phone.data = phonenumbers.format_number(parsed, 55)
		except (phonenumbers.phonenumberutil.NumberParseException, ValueError):
			raise ValidationError('Número de telefone inválido!')
		return
		
	def on_submit(self):
		hashed_password = bcrypt.generate_password_hash(self.password.data)
		new_user = User(
			email=self.email.data, 
			password=hashed_password, 
			username=self.username.data, 
			phone=self.phone.data,
			contacts=json.dumps([]),
			verified=False
		)

		db.session.add(new_user)
		db.session.commit()
		return

# Login form
# Table insertion:
class LoginForm(FlaskForm):
	email = EmailField('Endereço de Email', [InputRequired(), validators.Email()])
	password = PasswordField(validators=[InputRequired(), Length(min=8, max=100)])

	submit = SubmitField("Login")

	def validate_email(self, email):
		existing_user = db.session.execute(db.select(User).filter_by(email=email.data)).scalar_one_or_none()
		if existing_user is None:
			raise ValidationError("Esse usuário não existe!")
		return
		
	def validate_password(self, password):
		existing_user = db.session.execute(db.select(User).filter_by(email=self.email.data)).scalar_one_or_none()
		if existing_user and not bcrypt.check_password_hash(existing_user.password, password.data):
			raise ValidationError("Senha incorreta!")
		self.user = existing_user
		return

	def on_submit(self):
		user_dict = self.user._to_dict()
		session['user'] = user_dict

		# redirect to verify page
		if user_dict['verified']:
			login_user(self.user)
			return True
		else:
			return False

# Post form
# Table insertion:
class PostForm(FlaskForm):
	images = MultipleFileField(validators=[FileRequired(), FileAllowed(['jpg', 'png', 'webp'], 'Apenas imagens!')])
	location = SelectField('Município', choices=[], validate_choice=False)

	petName = StringField('Nome do Pet', validators=[InputRequired(), Length(min=3, max=100)])
	petDescription = TextAreaField('Descrição do Pet', validators=[InputRequired(), Length(min=10, max=1000)])
	petRace = SelectField('Raça do Pet', choices=[
		# Cães
		'Vira-Lata',
		'Labrador Retriever',
		'Golden Retriever',
		'Pitbull',
		'Bulldog Francês',
		'Poodle',
		'Shih Tzu',
		'Yorkshire Terrier',
		'Chihuahua',
		'Beagle',
		'Border Collie',
		'Husky Siberiano',
		'Dachshund',
		'Pug',
		
		# Gatos
		'Vira-Lata',
		'Siamês',
		'Persa',
		'Maine Coon',
		'Ragdoll',
		'Bengal',
		'Sphynx',
		'British Shorthair',
		
		# Outros pets (opcional)
		'Coelho',
		'Hamster',
		'Porquinho-da-índia',
		'Papagaio',
		'Peixe'
	])
	petAge = SelectField('Idade', choices=[
		'Recém-nascido a 6 meses',
		'De 6 meses a 1 ano',
		'De 1 ano a 6 anos',
		'De 6 anos ou mais'
	])
	petSex = SelectField('Sexo', choices=[
		'Macho',
		'Fêmea'
	])
	petSize = SelectField('Porte', choices=[
		"Grande",
		"Médio",
		"Pequeno"
	])

	submit = SubmitField("Postar")

	def on_submit(self):
		filenames = []
		for image in self.images.data:
			filename = str(uuid.uuid4())
			image.save(os.path.join(
				'uploads', 'posts', filename
			))
			filenames.append(filename)

		new_post = Post(
			userId = session['user']['id'],
			location = self.location.data,
			images = json.dumps(filenames),

			petName = self.petName.data,
			petRace = self.petRace.data,
			petAge = self.petAge.data,
			petSex = self.petSex.data,
			petSize = self.petSize.data,
			petDescription = self.petDescription.data
		)

		db.session.add(new_post)
		db.session.commit()
		return

# Profile form
# Table insertion:
class ProfileForm(FlaskForm):
	username = StringField(validators=[InputRequired(), Length(min=8, max=100)])
	email = EmailField('Endereço de Email', [InputRequired(), validators.Email()])
	phone = StringField('Número de Telefone', validators=[InputRequired(), Length(min=11, max=11)])
	image = FileField(validators=[FileAllowed(['jpg', 'png', 'webp'], 'Apenas imagens!')])

	submit = SubmitField("Aplicar")

	def on_submit(self, id):
		image = self.image.data
		if image.filename != '':
			image.save(os.path.join('uploads', 'profile_pictures', id))
		
		existing_user = db.session.execute(db.select(User).filter_by(id=id)).scalar_one_or_none()
		existing_user.username = self.username.data
		existing_user.email = self.email.data

		try:
			parsed = phonenumbers.parse(self.phone.data, "BR")
			if not phonenumbers.is_valid_number(parsed):
				raise ValueError()
			existing_user.phone = phonenumbers.format_number(parsed, 55)
		except (phonenumbers.phonenumberutil.NumberParseException, ValueError):
			return redirect(url_for('profile', id=id))  

		session['user'] = existing_user._to_dict()
		db.session.commit()
		return

def _verify_email():
	token = url_serializer.dumps(session['user']['email'], salt="email-confirm")
	link = url_for("confirm_email", token=token, _external=True)

	msg = MailMessage("Reenvio: Confirme seu email", sender=app.config["MAIL_USERNAME"], recipients=[session['user']['email']])
	msg.body = f"Clique aqui para verificar sua conta: {link}"
	mail.send(msg)
	return

# Verify Form
# Table alteration
class VerifyForm(FlaskForm):
	submit = SubmitField("Reenviar")

	def on_submit(self):
		return _verify_email()

# Route all pages
@app.route('/')
def home():
	return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
	loginForm = LoginForm()

	if loginForm.validate_on_submit():
		if loginForm.on_submit():
			return redirect(url_for('dashboard'))
		else:
			_verify_email()
			return redirect(url_for('verify'))
	return render_template('login.html', loginForm=loginForm)

@app.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
	logout_user()
	return redirect(url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
	registerForm = RegisterForm()

	if registerForm.validate_on_submit():
		registerForm.on_submit()
		return redirect(url_for('login'))
	return render_template('register.html', registerForm=registerForm)

@app.route('/messenger/<id>', methods=['GET', 'POST'])
def messenger(id):
	postForm = PostForm()

	existing_user = db.session.execute(db.select(User).filter_by(id=id)).scalar_one_or_none()
	if existing_user is None:
		return redirect(url_for('dashboard'))
	if postForm.validate_on_submit():
		postForm.on_submit()
		return redirect(url_for('dashboard', id=id))
	return render_template('messenger.html', postForm=postForm, session=session)

@app.route('/profile/<id>', methods=['GET', 'POST'])
@login_required
def profile(id):
	profileForm = ProfileForm()
	postForm = PostForm()

	if profileForm.validate_on_submit() and session['user']['id'] == int(id):
		profileForm.on_submit(id)
		return redirect(url_for('profile', id=id))
	if postForm.validate_on_submit():
		postForm.on_submit()
		return redirect(url_for('dashboard', id=id))

	existing_user = db.session.execute(db.select(User).filter_by(id=id)).scalar_one_or_none()
	if existing_user is None:
		return redirect(url_for('dashboard'))

	profile = {'user': existing_user._to_dict()}
	return render_template('profile.html', profile=profile, profileForm=profileForm, postForm=postForm)

@app.route('/dashboard', methods=['GET', 'POST'])
@login_required
def dashboard():
	postForm = PostForm()

	if postForm.validate_on_submit():
		postForm.on_submit()
		return redirect(url_for('dashboard'))
	return render_template('dashboard.html', postForm=postForm, session=session)

@app.route('/verify', methods=['GET', 'POST'])
def verify():
	verifyForm = VerifyForm()

	if verifyForm.is_submitted():
		verifyForm.on_submit()
		return redirect(url_for('verify'))
	else:
		return render_template('verify.html', verifyForm=verifyForm)

@app.route('/manifest.json', methods=['GET'])
def serve_manifest():
	return send_file('manifest.json', mimetype='application/manifest+json')

# API Section
@app.route('/api/posts', methods=['GET'])
def posts():  
	posts = db.session.execute(db.select(Post)).scalars().all()
	retrieved_info = [user._to_dict() for user in posts ]
	return jsonify(retrieved_info)

@app.route('/api/posts/delete', methods=['POST'])
def delete_post():	
	id = request.json.get("id")

	post = db.session.execute(
		db.select(Post).filter_by(id=id)
	).scalars().first()

	if post is None:
		return redirect(url_for('dashboard'))
	if post.userId != session['user']['id']:
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
	directory = os.path.join('uploads', subpath)
	file_path = os.path.join(directory, filename)

	if os.path.exists(file_path):
		return send_from_directory(directory, filename)

	if os.path.normpath(directory) == os.path.normpath('uploads/profile_pictures'):
		fallback_dir = os.path.join('static', 'images')
		fallback_filename = 'user_default.png'
		return send_from_directory(fallback_dir, fallback_filename)
	
@app.route('/api/session', methods=['GET'])
def serve_session():
	return jsonify(session.get('user'))

@app.route('/api/user/<id>', methods=['GET'])
def serve_user(id):
	existing_user = db.session.execute(db.select(User).filter_by(id=id)).scalar_one_or_none()
	if existing_user is None:
		return json.dumps([])
	return jsonify(existing_user._to_dict())

@app.route('/api/messenger/request/<int:sender>/<int:recipient>', methods=['GET'])
def serve_message(sender, recipient):
	messages = db.session.execute(db.select(Message).filter_by(senderId=sender, recipientId=recipient)).scalars()
	formatted_messages = []

	if messages is None:
		return "error"
	for message in messages:
		formatted_messages.append(message._to_dict())
	return jsonify(formatted_messages)

@app.route('/api/messenger/send', methods=['POST'])
def send_message():
	content = request.json.get("content")
	sender_id = request.json.get("sender")
	recipient_id = request.json.get("recipient")

	sender_user = db.session.execute(db.select(User).filter_by(id=sender_id)).scalar_one_or_none()
	recipient_user = db.session.execute(db.select(User).filter_by(id=recipient_id)).scalar_one_or_none()
	current_user = db.session.execute(db.select(User).filter_by(id=session['user']['id'])).scalar_one_or_none()

	if content is None or content == "":
		return "error"
	if sender_user is None or recipient_user is None:
		return "error"
	if sender_user.id == recipient_user.id:
		return "error"

	new_message = Message(
		senderId=sender_user.id,
		recipientId=recipient_user.id,
		content=content
	)

	# Load contacts safely
	sender_contacts = json.loads(sender_user.contacts or "[]")
	recipient_contacts = json.loads(recipient_user.contacts or "[]")

	# Add contacts if missing
	if recipient_id not in sender_contacts:
		sender_contacts.append(recipient_id)
	if sender_id not in recipient_contacts:
		recipient_contacts.append(sender_id)

	sender_user.contacts = json.dumps(sender_contacts)
	recipient_user.contacts = json.dumps(recipient_contacts)

	# Update session
	session['user'] = current_user._to_dict()

	db.session.add(new_message)
	db.session.commit()
	return "success"

@app.route("/api/verify/<token>")
def confirm_email(token):
	try:
		email = url_serializer.loads(token, salt="email-confirm", max_age=3600)  # 1 hour expiry
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
	app.run(debug=True)