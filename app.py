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
	email = EmailField('Endereço de Email', [validators.DataRequired(), validators.Email()])
	phone = StringField('Número de Telefone', validators=[InputRequired(), Length(min=11, max=13)])
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

# Login form
# Table insertion:
class LoginForm(FlaskForm):
	email = EmailField('Endereço de Email', [validators.DataRequired(), validators.Email()])
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

# Profile form
# Table insertion:
class ProfileForm(FlaskForm):
	username = StringField(validators=[InputRequired(), Length(min=8, max=100)])
	email = EmailField('Endereço de Email', [validators.DataRequired(), validators.Email()])
	phone = StringField('Número de Telefone', validators=[InputRequired(), Length(min=11, max=13)])
	image = FileField(validators=[FileAllowed(['jpg', 'png'], 'Apenas imagens!')])

	submit = SubmitField("Aplicar")

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
	form = LoginForm()

	if form.validate_on_submit():
		session['user'] = create_user_table(form.user)
		login_user(form.user)
		return redirect(url_for('dashboard'))
	return render_template('login.html', form=form)

@app.route('/register', methods=['GET', 'POST'])
def register():
	form = RegisterForm()

	if form.validate_on_submit():
		hashed_password = bcrypt.generate_password_hash(form.password.data)
		new_user = User(email=form.email.data, password=hashed_password, username=form.username.data, phone=form.phone.data)

		db.session.add(new_user)
		db.session.commit()

		return redirect(url_for('login'))
	return render_template('register.html', form=form)

@app.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
	logout_user()
	return redirect(url_for('login'))

@app.route('/profile/<id>', methods=['GET', 'POST'])
@login_required
def profile(id):
	form = ProfileForm()

	if form.validate_on_submit():		
		image = form.image.data
		if image.filename != '':
			image.save(os.path.join('uploads', 'pfps', str(id)))
	
	existing_user = db.session.execute(db.select(User).filter_by(id=id)).scalar_one_or_none()
	if existing_user is None:
		return redirect(url_for('dashboard'))
	
	profile = {'user': create_user_table(existing_user)}
	return render_template('profile.html', profile=profile, form=form)

@app.route('/dashboard', methods=['GET', 'POST'])
@login_required
def dashboard():
	form = PostForm()

	if form.validate_on_submit():
		filenames = []
		for image in form.images.data:
			filename = str(len(next(os.walk(os.path.join('uploads', 'posts')))[2]) +1)
			image.save(os.path.join(
				'uploads', 'posts', filename
			))
			filenames.append(filename)

		new_post = Post(
			username = session['user']['username'],
			userId = session['user']['id'],
			location = form.location.data,
			images = json.dumps(filenames),

			petName = form.petName.data,
			petRace = form.petRace.data,
			petAge = form.petAge.data,
			petSex = form.petSex.data,
			petSize = form.petSize.data,
		)

		db.session.add(new_post)
		db.session.commit()
		return redirect(url_for('dashboard'))
	else:
		print(form.errors)
	return render_template('dashboard.html', form=form, session=session)

@app.route('/posts', methods=['GET'])
def posts():  
	posts = db.session.execute(db.select(Post)).scalars().all()
	return jsonify(posts)

@app.route('/uploads/<filename>', methods=['GET'])
def get_file(filename):
	return send_from_directory('uploads/posts', filename)

@app.route('/manifest.json', methods=['GET'])
def serve_manifest():
	return send_file('manifest.json', mimetype='application/manifest+json')

@app.route('/session', methods=['GET'])
def serve_session():
	return jsonify(session.get('user'))

# Run the App
if __name__ == '__main__':
	app.run(debug=True)