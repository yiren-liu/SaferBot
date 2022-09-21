import os

import numpy as np

import pickle


from sklearn.feature_extraction.text import CountVectorizer

class LogisticRegressionEventType(object):
    def __init__(self) -> None:
        file_path = os.path.join(os.path.dirname(__file__), 'logistic_regression.pkl')
        # print(file_path)
        with open(file_path, 'rb') as f:
            self.vectorizer, self.clf = pickle.load(f)
        
    
    def predict(self, text):
        # 'Abuse', 'Attack', 'Break-In', 'Harass', 'Robbed', 'Stolen', 'Threaten'
        pred2eventType = {
            -1: '',
            0: 'abuse',
            1: 'attack',
            2: 'attack',
            3: 'assault',
            4: 'theft',
            5: 'theft',
            6: 'attack',
        }
        index = np.array(np.arange(7))
        inputs = self.vectorizer.transform([text])

        probs_y=self.clf.predict_proba(inputs).ravel()
        ranked_preds = np.argsort(probs_y)[::-1] # (7)
        ranked_event_types = [pred2eventType[pred] for pred in index[ranked_preds]]
        ranked_event_types_dedup = []
        ranked_probs = []
        for idx, event_type in enumerate(ranked_event_types):
            if event_type not in ranked_event_types_dedup:
                ranked_event_types_dedup.append(event_type)
                ranked_probs.append(probs_y[ranked_preds[idx]])


        index[probs_y < 0.3] = -1
        pred = index[np.argmax(probs_y)]

        # print('inferencing: ')
        # print(pred2eventType[pred])
        # print(ranked_event_types)
        # print(ranked_event_types_dedup)
        # print(probs_y)

        return pred2eventType[pred], ranked_event_types_dedup, ranked_probs
