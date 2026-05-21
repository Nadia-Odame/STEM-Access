"""
STEM Access Awareness Dashboard
A Flask web application that visualizes STEM education access data
for girls and underserved communities worldwide.
"""

import csv
import os
from flask import Flask, render_template, jsonify

app = Flask(__name__)

DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'stem_access_data.csv')


def load_csv_data():
    """Read the CSV dataset and return a list of dictionaries with typed values."""
    data = []
    with open(DATA_PATH, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append({
                'country': row['country'].strip(),
                'year': int(row['year']),
                'girls_stem_enrollment': float(row['girls_stem_enrollment']),
                'boys_stem_enrollment': float(row['boys_stem_enrollment']),
                'rural_access_rate': float(row['rural_access_rate']),
                'urban_access_rate': float(row['urban_access_rate']),
                'internet_access': float(row['internet_access']),
                'graduation_rate': float(row['graduation_rate']),
                'stem_funding_index': float(row['stem_funding_index']),
            })
    return data


@app.route('/')
def index():
    """Serve the main dashboard page."""
    return render_template('index.html')


@app.route('/api/data')
def api_data():
    """Return the full dataset as JSON for the frontend charts."""
    data = load_csv_data()
    return jsonify(data)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
