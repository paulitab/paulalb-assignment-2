# Install dependencies
install:
	pip install -r requirements.txt

# Run the Flask web app locally on http://localhost:3000
run:
	flask run --host=0.0.0.0 --port=3000
