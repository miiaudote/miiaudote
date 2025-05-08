from flask import *
from flask_login import *
from flask_wtf import FlaskForm
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy

from wtforms import *
from wtforms.validators import *

# Database and flask app:
app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SECRET_KEY'] = 'hugoguh12321'
app.app_context().push()

bcrypt = Bcrypt(app)
db = SQLAlchemy(app)

# Database code

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
	return User.query.get(int(user_id))

# User table:
class User(db.Model, UserMixin):
	id = db.Column(db.Integer, primary_key=True)

	username = db.Column(db.String(100), nullable=False)
	email = db.Column(db.String(100), nullable=False, unique=True)
	password = db.Column(db.String(100), nullable=False)

# Posts table:
class Post(db.Model, UserMixin):
	id = db.Column(db.Integer, primary_key=True)
	idUser = db.Column(db.Integer)

	# Pet Attributes
	name = db.Column(db.String(100), nullable=False)
	race = db.Column(db.String(100), nullable=False)
	age = db.Column(db.Integer, nullable=False)
	sex = db.Column(db.String(2), nullable=False)
	size = db.Column(db.String(100), nullable=False)

# Register form
# Table insertion:
class RegisterForm(FlaskForm):
	username = StringField(validators=[InputRequired(), Length(min=8, max=100)], render_kw={"placeholder": "Nome completo"})
	email = EmailField('Endereço de Email', [validators.DataRequired(), validators.Email()], render_kw={"placeholder": "Email"})
	password = PasswordField(validators=[InputRequired(), Length(min=8, max=100)], render_kw={"placeholder": "Senha"})
	
	submit = SubmitField("Registrar")

	def validate_email(self, email):
		existing_user = User.query.filter_by(email=email.data).first()
		if existing_user:
			raise ValidationError("Esse usuário já existe!")

# Login form
# Table insertion:
class LoginForm(FlaskForm):
	email = EmailField('Endereço de Email', [validators.DataRequired(), validators.Email()], render_kw={"placeholder": "Email"})
	password = PasswordField(validators=[InputRequired(), Length(min=8, max=100)], render_kw={"placeholder": "Senha"})

	submit = SubmitField("Login")

	def validate_email(self, email):
		existing_user = User.query.filter_by(email=email.data).first()
		if not existing_user:
			raise ValidationError("Esse usuário não existe!")
		
	def validate_password(self, password):
		existing_user = User.query.filter_by(email=self.email.data).first()
		if existing_user and not bcrypt.check_password_hash(existing_user.password, password.data):
			raise ValidationError("Senha incorreta!")
		self.user = existing_user

# Route all pages
@app.route('/')
def home():
	return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
	form = LoginForm()

	if form.validate_on_submit():
		session['user'] = {
			'email': form.user.email,
			'username': form.user.username
		}
		login_user(form.user)
		return redirect(url_for('dashboard'))
	return render_template('login.html', form=form)

@app.route('/register', methods=['GET', 'POST'])
def register():
	form = RegisterForm()

	if form.validate_on_submit():
		hashed_password = bcrypt.generate_password_hash(form.password.data)
		new_user = User(email=form.email.data, password=hashed_password, username=form.username.data)

		db.session.add(new_user)
		db.session.commit()

		return redirect(url_for('login'))
	return render_template('register.html', form=form)

@app.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
	logout_user()
	return redirect(url_for('login'))

@app.route('/dashboard', methods=['GET', 'POST'])
@login_required
def dashboard():
	return render_template('dashboard.html', session=session)

@app.route('/manifest.json')
def serve_manifest():
	return send_file('manifest.json', mimetype='application/manifest+json')

# Run the App
if __name__ == '__main__':
	app.run(debug=True)