import os, json, uuid, phonenumbers

from app import bcrypt
from db import *

from flask import redirect, url_for
from flask_login import login_user

from flask_wtf import FlaskForm
from flask_wtf.file import MultipleFileField, FileRequired, FileAllowed

from wtforms import *
from wtforms.validators import *

class RegisterForm(FlaskForm):
	username = StringField(validators=[InputRequired(), Length(min=8, max=100)])
	email = EmailField('Endereço de Email', [InputRequired(), Email()])
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

	def on_submit(self, bcrypt):
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

class LoginForm(FlaskForm):
	email = EmailField('Endereço de Email', [InputRequired(), Email()])
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

	def on_submit(self, session):
		user_dict = self.user.to_dict()
		session['user'] = user_dict
		if user_dict['verified']:
			login_user(self.user)
			return True
		else:
			return False

class PostForm(FlaskForm):
	images = MultipleFileField(validators=[FileRequired(), FileAllowed(['jpg', 'png', 'webp'], 'Apenas imagens!')])
	location = SelectField('Município', choices=[], validate_choice=False)
	
	pet_name = StringField('Nome do Pet', validators=[InputRequired(), Length(min=3, max=100)])
	pet_description = TextAreaField('Descrição do Pet', validators=[InputRequired(), Length(min=10, max=1000)])
	pet_race = SelectField('Raça do Pet', choices=[
		'Vira-Lata', 'Labrador Retriever', 'Golden Retriever', 
		'Pitbull', 'Bulldog Francês', 'Poodle',
		'Shih Tzu', 'Yorkshire Terrier', 
		'Chihuahua', 'Beagle', 'Border Collie', 
		'Husky Siberiano', 'Dachshund', 'Pug', 
		'Vira-Lata', 'Siamês', 'Persa', 
		'Maine Coon', 'Ragdoll', 'Bengal',
		'Sphynx', 'British Shorthair', 'Coelho', 
		'Hamster', 'Porquinho-da-índia', 'Papagaio', 'Peixe'
	])
	pet_age = SelectField('Idade', choices=[
		'Recém-nascido a 6 meses', 
		'De 6 meses a 1 ano', 
		'De 1 ano a 6 anos', 
		'De 6 anos ou mais'
	])
	pet_sex = SelectField('Sexo', choices=['Macho', 'Fêmea'])
	pet_size = SelectField('Porte', choices=['Grande', 'Médio', 'Pequeno'])
	submit = SubmitField("Postar")

	def on_submit(self, session):
		filenames = []
		
		for image in self.images.data:
			filename = str(uuid.uuid4())
			image.save(os.path.join('uploads', 'posts', filename))
			filenames.append(filename)
			
		new_post = Post(
			user_id = session['user']['id'],
			location = self.location.data,
			images = json.dumps(filenames),
			pet_name = self.pet_name.data,
			pet_race = self.pet_race.data,
			pet_age = self.pet_age.data,
			pet_sex = self.pet_sex.data,
			pet_size = self.pet_size.data,
			pet_description = self.pet_description.data
		)
		db.session.add(new_post)
		db.session.commit()
		return

class ProfileForm(FlaskForm):
	username = StringField(validators=[InputRequired(), Length(min=8, max=100)])
	email = EmailField('Endereço de Email', [InputRequired(), Email()])
	phone = StringField('Número de Telefone', validators=[InputRequired(), Length(min=11, max=11)])
	image = FileField(validators=[FileAllowed(['jpg', 'png', 'webp'], 'Apenas imagens!')])
	
	submit = SubmitField("Aplicar")

	def on_submit(self, id, session):
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
		
		session['user'] = existing_user.to_dict()
		db.session.commit()
		return

class VerifyForm(FlaskForm):
	submit = SubmitField("Reenviar")