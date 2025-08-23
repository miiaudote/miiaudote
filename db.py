import json

from flask_login import *
from flask_sqlalchemy import SQLAlchemy

from dataclasses import dataclass

# Create Instances
db = SQLAlchemy()

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
	sent_messages = db.relationship('Message', foreign_keys='Message.sender_id', back_populates='sender')
	received_messages = db.relationship('Message', foreign_keys='Message.recipient_id', back_populates='recipient')

	def to_dict(self):
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
	user_id: int = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

	location: str = db.Column(db.String(100), nullable=False)
	images: str = db.Column(db.JSON, nullable=False)

	# Pet Attributes
	pet_name: str = db.Column(db.String(100), nullable=False)
	pet_race: str = db.Column(db.String(100), nullable=False)
	pet_age: int = db.Column(db.Integer, nullable=False)
	pet_sex: str = db.Column(db.String(2), nullable=False)
	pet_size: str = db.Column(db.String(100), nullable=False)
	pet_description: str = db.Column(db.String(500), nullable=False)

	user = db.relationship('User', back_populates='posts')

	def to_dict(self):
		return {
			"id": self.id,
			"pet_name": self.pet_name,
			"location": self.location,
			"images": self.images,
			"pet_race": self.pet_race,
			"pet_age": self.pet_age,
			"pet_sex": self.pet_sex,
			"pet_size": self.pet_size,
			"pet_description": self.pet_description,
			"user_id": self.user_id,
			"username": self.user.username
		}
	
# Messages table:
@dataclass
class Message(db.Model):
	__tablename__ = 'messages'

	# Post Attributes
	id: int = db.Column(db.Integer, primary_key=True)
	sender_id: int = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
	recipient_id: int = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
	content: str = db.Column(db.String(500), nullable=False)

	sender = db.relationship('User', foreign_keys=[sender_id], back_populates='sent_messages')
	recipient = db.relationship('User', foreign_keys=[recipient_id], back_populates='received_messages')

	def to_dict(self):
		return {
			"id": self.id,
			"sender_id": self.sender_id,
			"recipient_id": self.recipient_id,
			"content": self.content
		}