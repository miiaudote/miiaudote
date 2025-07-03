import os, json

from flask import *
from flask_login import *

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
app.app_context().push()

bcrypt = Bcrypt(app)
db = SQLAlchemy()
db.init_app(app)

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

# Posts table:
@dataclass
class Post(db.Model, UserMixin):
	__tablename__ = 'posts'

	# Post Attributes
	id: int = db.Column(db.Integer, primary_key=True)
	userId: int = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
	
	username: str = db.Column(db.String(100), nullable=False)
	location: str = db.Column(db.String(100), nullable=False)
	images: str = db.Column(db.String(256), nullable=False)

	# Pet Attributes
	petName: str = db.Column(db.String(100), nullable=False)
	petRace: str = db.Column(db.String(100), nullable=False)
	petAge: int = db.Column(db.Integer, nullable=False)
	petSex: str = db.Column(db.String(2), nullable=False)
	petSize: str = db.Column(db.String(100), nullable=False)

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

	def validate_phone(self, phone):
		try:
			parsed = phonenumbers.parse(phone.data, "BR")
			if not phonenumbers.is_valid_number(parsed):
				raise ValueError()
			self.phone.data = phonenumbers.format_number(parsed, 55)
		except (phonenumbers.phonenumberutil.NumberParseException, ValueError):
			raise ValidationError('Número de telefone inválido!')
		
	def on_submit(self):
		hashed_password = bcrypt.generate_password_hash(self.password.data)
		new_user = User(email=self.email.data, password=hashed_password, username=self.username.data, phone=self.phone.data)

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
		
	def validate_password(self, password):
		existing_user = db.session.execute(db.select(User).filter_by(email=self.email.data)).scalar_one_or_none()
		if existing_user and not bcrypt.check_password_hash(existing_user.password, password.data):
			raise ValidationError("Senha incorreta!")
		self.user = existing_user

	def on_submit(self):
		session['user'] = create_user_table(self.user)
		login_user(self.user)
		return

# Post form
# Table insertion:
class PostForm(FlaskForm):
	images = MultipleFileField(validators=[FileRequired(), FileAllowed(['jpg', 'png'], 'Apenas imagens!')])
	location = SelectField('Município', choices=[], validate_choice=False)

	petName = StringField('Nome do Pet', validators=[InputRequired(), Length(min=3, max=100)])
	petRace = SelectField('Raça do Pet', choices=[
		'Border Collie', 
		'Pitbull',
		'Chihuahua',
		'Labrador',
		'Vira-Lata'
	])
	petAge = SelectField('Idade', choices=[
		'Recém-nascido a 6 meses',
		'6 meses a 1 ano',
		'1 ano a 6 anos',
		'6 anos ou mais'
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
			filename = str(len(next(os.walk(os.path.join('uploads', 'posts')))[2]) +1)
			image.save(os.path.join(
				'uploads', 'posts', filename
			))
			filenames.append(filename)

		new_post = Post(
			username = session['user']['username'],
			userId = session['user']['id'],
			location = self.location.data,
			images = json.dumps(filenames),

			petName = self.petName.data,
			petRace = self.petRace.data,
			petAge = self.petAge.data,
			petSex = self.petSex.data,
			petSize = self.petSize.data,
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
	image = FileField(validators=[FileAllowed(['jpg', 'png'], 'Apenas imagens!')])

	submit = SubmitField("Aplicar")

	def on_submit(self):
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

		session['user'] = create_user_table(existing_user)
		db.session.commit()

# Helper Functions
def create_user_table(user: User):
	return {
		'id': user.id,
		'email': user.email,
		'username': user.username,
		'phone': user.phone
	}

# Route all pages
@app.route('/')
def home():
	return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
	loginForm = LoginForm()

	if loginForm.validate_on_submit():
		loginForm.on_submit()
		return redirect(url_for('dashboard'))
	return render_template('login.html', loginForm=loginForm)

@app.route('/register', methods=['GET', 'POST'])
def register():
	registerForm = RegisterForm()

	if registerForm.validate_on_submit():
		registerForm.on_submit()
		return redirect(url_for('login'))
	return render_template('register.html', registerForm=registerForm)

@app.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
	logout_user()
	return redirect(url_for('login'))

@app.route('/profile/<id>', methods=['GET', 'POST'])
@login_required
def profile(id):
	profileForm = ProfileForm()
	postForm = PostForm()

	if profileForm.validate_on_submit() and session['user']['id'] == int(id):
		profileForm.on_submit()
		return redirect(url_for('profile', id=id))
	if postForm.validate_on_submit():
		postForm.on_submit()
		return redirect(url_for('profile', id=id))

	existing_user = db.session.execute(db.select(User).filter_by(id=id)).scalar_one_or_none()
	if existing_user is None:
		return redirect(url_for('dashboard'))

	profile = {'user': create_user_table(existing_user)}
	return render_template('profile.html', profile=profile, profileForm=profileForm, postForm=postForm)

@app.route('/dashboard', methods=['GET', 'POST'])
@login_required
def dashboard():
	postForm = PostForm()

	if postForm.validate_on_submit():
		postForm.on_submit()
		return redirect(url_for('dashboard'))
	return render_template('dashboard.html', postForm=postForm, session=session)

@app.route('/posts', methods=['GET'])
def posts():  
	posts = db.session.execute(db.select(Post)).scalars().all()
	return jsonify(posts)

@app.route('/uploads/<path:subpath>/<filename>', methods=['GET'])
def get_file(subpath, filename):
	directory = os.path.join('uploads', subpath)
	file_path = os.path.join(directory, filename)

	if os.path.exists(file_path):
		return send_from_directory(directory, filename)

	if os.path.normpath(directory) == os.path.normpath('uploads/profile_pictures'):
		fallback_dir = os.path.join('static', 'images')
		fallback_filename = 'user_default.png'
		return send_from_directory(fallback_dir, fallback_filename)

@app.route('/manifest.json', methods=['GET'])
def serve_manifest():
	return send_file('manifest.json', mimetype='application/manifest+json')

@app.route('/session', methods=['GET'])
def serve_session():
	return jsonify(session.get('user'))

# Run the App
if __name__ == '__main__':
	app.run(debug=True)