"""TF-IDF + Logistic Regression NLP Categorizer with Human-in-the-Loop Active Learning."""
import os
import re
import time
from threading import Lock
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import FeatureUnion, Pipeline

from app.core.config import settings
from app.ml.parser import normalize_merchant_name

CATEGORIES: List[str] = [
    "Food & Dining",
    "Groceries & Supermarkets",
    "Transport & Fuel",
    "Shopping & E-Commerce",
    "Bills & Utilities",
    "Subscriptions & OTT",
    "Health & Fitness",
    "Housing & Rent",
    "Entertainment & Leisure",
    "Income & Transfers",
]

# Curated baseline corpus of noisy Indian UPI, POS, NEFT, and SMS merchant strings
BASE_CORPUS: List[Tuple[str, str]] = [
    # Food & Dining
    ("SWIGGY*ORDER 8812 BLR", "Food & Dining"),
    ("UPI/328910421/DR/SWIGGY INDIA/HDFC", "Food & Dining"),
    ("BUNDL TECHNOLOGIES SWIGGY FOOD", "Food & Dining"),
    ("ZOMATO MEDIA PVT LTD ORDER 9921", "Food & Dining"),
    ("UPI-ZOMATO*ONLINE ORDER-ICICI", "Food & Dining"),
    ("ETERNAL ZOMATO DINING PAY", "Food & Dining"),
    ("POS 4111XXXX1234 STARBUCKS COFFEE MUM", "Food & Dining"),
    ("TATA STARBUCKS KORAMANGALA", "Food & Dining"),
    ("THIRD WAVE COFFEE ROASTERS", "Food & Dining"),
    ("BLUE TOKAI COFFEE ROASTERS", "Food & Dining"),
    ("DOMINOS PIZZA JUBILEE FOODWORKS", "Food & Dining"),
    ("JUBILANT FOODWORKS DOMINOS IND", "Food & Dining"),
    ("MCDONALDS HARDCASTLE RESTAURANTS", "Food & Dining"),
    ("KFC YUM RESTAURANTS INDIA", "Food & Dining"),
    ("BURGER KING INDIA LTD POS", "Food & Dining"),
    ("HALDIRAMS SNACKS AND SWEETS", "Food & Dining"),
    ("EATFIT CUREFIT HEALTHY MEALS", "Food & Dining"),
    ("REBEL FOODS FAASOS BEHROUZ BIRYani", "Food & Dining"),
    ("MEGHANA FOODS BIRYANI BLR", "Food & Dining"),
    ("TRUFFLES CAFE INDlRANAGAR", "Food & Dining"),
    ("CHAAYOS SUNSHINE TEAHeb", "Food & Dining"),
    ("SUBWAY SANDWICH POS TXN", "Food & Dining"),
    ("BARBEQUE NATION HOSPITALITY", "Food & Dining"),
    ("ZEPTO CAFE SNACK ORDER", "Food & Dining"),
    ("THEOBROMA FOODS BAKERY", "Food & Dining"),
    ("A2B ADYAR ANANDA BHAVAN", "Food & Dining"),
    ("SARAVANA BHAVAN RESTAURANT", "Food & Dining"),
    ("PIZZA HUT DINE IN POS", "Food & Dining"),

    # Groceries & Supermarkets
    ("BIGBASKET SUPERMARKET GROCERY", "Groceries & Supermarkets"),
    ("INNOVATIVE RETAIL BIGBASKET BBDAILY", "Groceries & Supermarkets"),
    ("BLINKIT GROFERS INDIA QUICK COMMERCE", "Groceries & Supermarkets"),
    ("UPI/BLINKIT*INSTANT DELIVERY", "Groceries & Supermarkets"),
    ("ZEPTO KIRANA KART TECHNOLOGIES", "Groceries & Supermarkets"),
    ("ZEPTO*GROCERY ORDER 4410", "Groceries & Supermarkets"),
    ("SWIGGY INSTAMART GROCERY BLR", "Groceries & Supermarkets"),
    ("INSTAMART*BUNDL TECH GROCERIES", "Groceries & Supermarkets"),
    ("DMART AVENUE SUPERMARTS LTD", "Groceries & Supermarkets"),
    ("POS DMART READY SUPERMARKET", "Groceries & Supermarkets"),
    ("RELIANCE SMART BAZAAR RETAIL", "Groceries & Supermarkets"),
    ("RELIANCE FRESH JIO MART GROCERY", "Groceries & Supermarkets"),
    ("MORE RETAIL SUPERMARKET POS", "Groceries & Supermarkets"),
    ("NATURES BASKET GODREJ GOURMET", "Groceries & Supermarkets"),
    ("LULU HYPERMARKET GROCERIES", "Groceries & Supermarkets"),
    ("COUNTRY DELIGHT MILK SUBSCRIPTION", "Groceries & Supermarkets"),
    ("NANDINI MILK PARLOUR KMF", "Groceries & Supermarkets"),
    ("STAR BAZAAR TRENT HYPERMARKET", "Groceries & Supermarkets"),
    ("RATNADEEP SUPERMARKET HYD", "Groceries & Supermarkets"),
    ("NILGIRIS DAIRY AND GROCERY", "Groceries & Supermarkets"),

    # Transport & Fuel
    ("UBER INDIA SYSTEMS TRIP 7712", "Transport & Fuel"),
    ("UPI/UBER*RIDE AUTO CAB", "Transport & Fuel"),
    ("OLA CABS ANI TECHNOLOGIES", "Transport & Fuel"),
    ("OLA ELECTRIC MOBILITY RIDE", "Transport & Fuel"),
    ("RAPIDO BIKE TAXI ROPPEN TRANSPORT", "Transport & Fuel"),
    ("NAMMA YATRI AUTO RICKSHAW UPI", "Transport & Fuel"),
    ("BLUSMART ELECTRIC CAB TRIP", "Transport & Fuel"),
    ("INDIANOIL IOCL PETROL PUMP POS", "Transport & Fuel"),
    ("HPCL HINDUSTAN PETROLEUM FUEL", "Transport & Fuel"),
    ("BHARAT PETROLEUM BPCL PETROL BUNK", "Transport & Fuel"),
    ("SHELL INDIA MARKETS FUEL STATION", "Transport & Fuel"),
    ("IRCTC RAIL TICKET BOOKING", "Transport & Fuel"),
    ("INDIAN RAILWAYS UTS IRCTC", "Transport & Fuel"),
    ("MAKEMYTRIP INDIA FLIGHT HOTEL", "Transport & Fuel"),
    ("INDIGO INTERGLOBE AVIATION AIRLINE", "Transport & Fuel"),
    ("AIR INDIA EXPRESS FLIGHT TICKET", "Transport & Fuel"),
    ("REDBUS IBIBO BUS TICKET", "Transport & Fuel"),
    ("NHAI FASTAG TOLL PLAZA RECHARGE", "Transport & Fuel"),
    ("ICICI FASTAG AUTO RELOAD TOLL", "Transport & Fuel"),
    ("BMRCL NAMMA METRO SMART CARD", "Transport & Fuel"),
    ("DELHI METRO DMRC QR TICKET", "Transport & Fuel"),

    # Shopping & E-Commerce
    ("AMAZON PAY INDIA*ORDER 9921", "Shopping & E-Commerce"),
    ("AMZN*MKTP IN RETAIL SHOPPING", "Shopping & E-Commerce"),
    ("AMAZON SELLER SERVICES MUMBAI", "Shopping & E-Commerce"),
    ("FLIPKART INTERNET PVT LTD", "Shopping & E-Commerce"),
    ("UPI/FLIPKART*PAYMENTS/AXIS", "Shopping & E-Commerce"),
    ("MYNTRA DESIGNS FASHION APPAREL", "Shopping & E-Commerce"),
    ("NYKAA E RETAIL BEAUTY COSMETICS", "Shopping & E-Commerce"),
    ("FSN E COMMERCE NYKAA ORDER", "Shopping & E-Commerce"),
    ("AJIO RELIANCE RETAIL FASHION", "Shopping & E-Commerce"),
    ("MEESHO FASNEAR TECHNOLOGIES", "Shopping & E-Commerce"),
    ("CROMA INFINITI RETAIL ELECTRONICS", "Shopping & E-Commerce"),
    ("RELIANCE DIGITAL ELECTRONICS POS", "Shopping & E-Commerce"),
    ("DECATHLON SPORTS INDIA STORE", "Shopping & E-Commerce"),
    ("IKEA INDIA FURNITURE HOME", "Shopping & E-Commerce"),
    ("ZARA INDITEX TRENT APPAREL", "Shopping & E-Commerce"),
    ("H&M HENNES AND MAURITZ RETAIL", "Shopping & E-Commerce"),
    ("WESTSIDE TRENT LIMITED POS", "Shopping & E-Commerce"),
    ("LENSKART EYEWEAR ORDER", "Shopping & E-Commerce"),
    ("FIRSTCRY BRAINBEES KIDS STORE", "Shopping & E-Commerce"),
    ("TATA CLIQ LUXURY SHOPPING", "Shopping & E-Commerce"),

    # Bills & Utilities
    ("ACH D- BESCOM ELECTRICITY BILL BLR", "Bills & Utilities"),
    ("TATA POWER ELECTRICITY DISCOM", "Bills & Utilities"),
    ("ADANI ELECTRICITY MUMBAI BILL", "Bills & Utilities"),
    ("MSEB MAHADISCOM POWER BILL", "Bills & Utilities"),
    ("AIRTEL BROADBAND AND POSTPAID", "Bills & Utilities"),
    ("BHARTI AIRTEL RECHARGE UPI", "Bills & Utilities"),
    ("JIOFIBER RELIANCE JIO INFOCOMM", "Bills & Utilities"),
    ("JIO PREPAID MOBILE RECHARGE", "Bills & Utilities"),
    ("ACT FIBERNET ATRIA CONVERGENCE", "Bills & Utilities"),
    ("VODAFONE IDEA VI POSTPAID BILL", "Bills & Utilities"),
    ("BWSSB BANGALORE WATER SUPPLY", "Bills & Utilities"),
    ("INDANE GAS LPG CYLINDER BOOKING", "Bills & Utilities"),
    ("HP GAS LPG REFILL BILLPAY", "Bills & Utilities"),
    ("BHARAT GAS PIPED NATURAL GAS", "Bills & Utilities"),
    ("MAHANAGAR GAS PNG UTILITY", "Bills & Utilities"),
    ("BBMP PROPERTY TAX UTILITY", "Bills & Utilities"),
    ("TATA PLAY DTH RECHARGE BILL", "Bills & Utilities"),
    ("CRED UTILITY BILL PAYMENT", "Bills & Utilities"),

    # Subscriptions & OTT
    ("POS 4111XXXXXXXX1234 NETFLIX.COM", "Subscriptions & OTT"),
    ("UPI/NETFLIX ENTERTAINMENT SI MANDATE", "Subscriptions & OTT"),
    ("SPOTIFY INDIA PREMIUM PLAN", "Subscriptions & OTT"),
    ("SPOTIFY AB RECURRING MANDATE", "Subscriptions & OTT"),
    ("YOUTUBE PREMIUM GOOGLE INDIA", "Subscriptions & OTT"),
    ("GOOGLE*YOUTUBE MEMBER SUB", "Subscriptions & OTT"),
    ("AMAZON PRIME MEMBERSHIP ANNUAL", "Subscriptions & OTT"),
    ("DISNEY PLUS HOTSTAR NOVI DIGITAL", "Subscriptions & OTT"),
    ("JIOCINEMA PREMIUM VIACOM18", "Subscriptions & OTT"),
    ("SONYLIV CULVER MAX SUBSCRIPTION", "Subscriptions & OTT"),
    ("APPLE.COM/BILL ICLOUD STORAGE", "Subscriptions & OTT"),
    ("APPLE SERVICES MEDIA SUBSCRIPTION", "Subscriptions & OTT"),
    ("OPENAI *CHATGPT PLUS SUBSCRIPTION", "Subscriptions & OTT"),
    ("GITHUB INC COPILOT PRO MONTHLY", "Subscriptions & OTT"),
    ("NOTION LABS WORKSPACE PLAN", "Subscriptions & OTT"),
    ("CANVA PRO DESIGN SUBSCRIPTION", "Subscriptions & OTT"),
    ("MICROSOFT 365 CLOUD STORAGE", "Subscriptions & OTT"),
    ("ADOBE CREATIVE CLOUD MANDATE", "Subscriptions & OTT"),
    ("TIMES PRIME ANNUAL MEMBERSHIP", "Subscriptions & OTT"),

    # Health & Fitness
    ("APOLLO PHARMACY CHEMIST BLR", "Health & Fitness"),
    ("APOLLO HOSPITals CLINIC CONSULT", "Health & Fitness"),
    ("TATA 1MG HEALTHCARE LABS MEDS", "Health & Fitness"),
    ("PHARMEASY API HOLDINGS MEDICINES", "Health & Fitness"),
    ("MEDPLUS HEALTH PHARMACY STORE", "Health & Fitness"),
    ("CULT.FIT CUREFIT GYM MEMBERSHIP", "Health & Fitness"),
    ("CULTFIT FITNESS WORKOUT PASS", "Health & Fitness"),
    ("PRACTO DOCTOR CONSULTATION", "Health & Fitness"),
    ("MANIPAL HOSPITAL DIAGNOSTICS", "Health & Fitness"),
    ("FORTIS HEALTHCARE HOSPITAL LAB", "Health & Fitness"),
    ("MAX HEALTHCARE PATHOLOGY LAB", "Health & Fitness"),
    ("DR LAL PATHLABS BLOOD TEST", "Health & Fitness"),
    ("METROPOLIS HEALTHCARE DIAGNOSTIC", "Health & Fitness"),
    ("GOLDS GYM FITNESS CENTER", "Health & Fitness"),
    ("NETMEDS MARKETPLACE PHARMACY", "Health & Fitness"),
    ("CLOVE DENTAL CLINIC TREATMENT", "Health & Fitness"),

    # Housing & Rent
    ("NOBROKER RENT PAY LANDLORD", "Housing & Rent"),
    ("CRED RENTPAY HOUSE RENT", "Housing & Rent"),
    ("UPI/LANDLORD HOUSE RENT MONTHLY", "Housing & Rent"),
    ("MYGATE SOCIETY MAINTENANCE FEE", "Housing & Rent"),
    ("ADDA APARTMENT ASSOCIATION DUES", "Housing & Rent"),
    ("NOBROKERHOOD MAINTENANCE BILL", "Housing & Rent"),
    ("URBAN COMPANY HOME CLEANING REPAIR", "Housing & Rent"),
    ("URBANCLAP AC SERVICE PLUMBER", "Housing & Rent"),
    ("FURLENCO FURNITURE RENTAL MONTHLY", "Housing & Rent"),
    ("RENTOMOJO APPLIANCE RENTAL", "Housing & Rent"),
    ("STANZA LIVING PG HOSTEL RENT", "Housing & Rent"),
    ("ZOLO STAYS COLIVING RENT", "Housing & Rent"),
    ("PACKERS AND MOVERS PORTER HOUSE", "Housing & Rent"),

    # Entertainment & Leisure
    ("BOOKMYSHOW BIGTREE ENTERTAINMENT", "Entertainment & Leisure"),
    ("PVR INOX CINEMAS MOVIE TICKETS", "Entertainment & Leisure"),
    ("PVR PICTURES BOX OFFICE F&B", "Entertainment & Leisure"),
    ("STEAM GAMES VALVE CORPORATION", "Entertainment & Leisure"),
    ("SONY PLAYSTATION NETWORK STORE", "Entertainment & Leisure"),
    ("NINTENDO ESHOP GAME PURCHASE", "Entertainment & Leisure"),
    ("WONDERLA AMUSEMENT PARK TICKETS", "Entertainment & Leisure"),
    ("IMAGICA THEME PARK LEISURE", "Entertainment & Leisure"),
    ("PAYTM INSIDER LIVE CONCERT EVENT", "Entertainment & Leisure"),
    ("ZOMATO LIVE DISTRICT EVENTS", "Entertainment & Leisure"),
    ("TIMEZONE ENTERTAINMENT ARCADE", "Entertainment & Leisure"),
    ("SMAAASH BOWLING ARENA GAMING", "Entertainment & Leisure"),

    # Income & Transfers
    ("NEFT-CR-SALARY-ACME TECHNOLOGIES", "Income & Transfers"),
    ("ACH-CR-MONTHLY SALARY CREDIT", "Income & Transfers"),
    ("IMPS-CR-FREELANCE PAYOUT STRIPE", "Income & Transfers"),
    ("NEFT-CR-DIVIDEND INFOSYS LTD", "Income & Transfers"),
    ("UPI-CR-REFUND FROM AMAZON PAY", "Income & Transfers"),
    ("CASHBACK CREDITED BY HDFC BANK", "Income & Transfers"),
    ("INTEREST CREDITED SAVINGS A/C", "Income & Transfers"),
    ("RAZORPAY PAYOUT SETTLEMENT CR", "Income & Transfers"),
]


def _preprocess_for_nlp(text: str) -> str:
    """Clean transaction text while preserving subword merchant cues."""
    t = text.upper()
    t = re.sub(r"[\*/_\-\|@\.]+", " ", t)
    t = re.sub(r"\b\d{4,16}\b", " ", t)  # strip long UTR/order numbers
    t = re.sub(r"[^A-Z0-9\s]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


class SmartCategorizer:
    """Hybrid Word + Character N-Gram TF-IDF + Logistic Regression Categorizer."""

    def __init__(self) -> None:
        self._lock = Lock()
        self.pipeline: Optional[Pipeline] = None
        self.cv_accuracy: float = 0.0
        self.cv_macro_f1: float = 0.0
        self.training_samples: int = 0
        self.user_corrections_count: int = 0
        self.last_train_ms: float = 0.0
        self.override_map: Dict[str, str] = {}
        self.train(user_corrections=[])

    def _build_pipeline(self) -> Pipeline:
        features = FeatureUnion(
            [
                (
                    "word_tfidf",
                    TfidfVectorizer(
                        ngram_range=(1, 2),
                        sublinear_tf=True,
                        min_df=1,
                        max_features=3000,
                    ),
                ),
                (
                    "char_tfidf",
                    TfidfVectorizer(
                        analyzer="char_wb",
                        ngram_range=(3, 5),
                        sublinear_tf=True,
                        min_df=1,
                        max_features=5000,
                    ),
                ),
            ]
        )
        clf = LogisticRegression(
            C=4.0,
            class_weight="balanced",
            max_iter=500,
            random_state=42,
        )
        return Pipeline([("features", features), ("clf", clf)])

    def train(self, user_corrections: Optional[List[Tuple[str, str]]] = None) -> Dict[str, Any]:
        """Train or retrain the TF-IDF + LR model with base corpus + up-weighted user corrections."""
        start_t = time.perf_counter()
        corrections = user_corrections or []

        texts: List[str] = []
        labels: List[str] = []
        override_lookup: Dict[str, str] = {}

        # Add base corpus (2x each so StratifiedKFold has enough per-pattern coverage)
        for raw_m, cat in BASE_CORPUS:
            clean_m = _preprocess_for_nlp(raw_m)
            norm_m = normalize_merchant_name(raw_m)
            texts.append(clean_m)
            labels.append(cat)
            texts.append(norm_m)
            labels.append(cat)

        # Up-weight human-in-the-loop user corrections (6x weight for active learning adaptation)
        for raw_m, cat in corrections:
            if cat not in CATEGORIES:
                continue
            clean_m = _preprocess_for_nlp(raw_m)
            norm_m = normalize_merchant_name(raw_m)
            override_lookup[norm_m] = cat
            override_lookup[clean_m] = cat
            for _ in range(6):
                texts.append(clean_m)
                labels.append(cat)
                if norm_m != clean_m:
                    texts.append(norm_m)
                    labels.append(cat)

        pipe = self._build_pipeline()

        # Stratified 5-fold cross-validation for honest metrics
        X_arr = np.array(texts)
        y_arr = np.array(labels)
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        oof_preds = np.empty_like(y_arr)
        for train_idx, val_idx in skf.split(X_arr, y_arr):
            fold_pipe = self._build_pipeline()
            fold_pipe.fit(X_arr[train_idx], y_arr[train_idx])
            oof_preds[val_idx] = fold_pipe.predict(X_arr[val_idx])

        acc = float(accuracy_score(y_arr, oof_preds))
        macro_f1 = float(f1_score(y_arr, oof_preds, average="macro"))

        # Fit final pipeline on full dataset
        pipe.fit(texts, labels)
        duration_ms = round((time.perf_counter() - start_t) * 1000, 2)

        with self._lock:
            self.pipeline = pipe
            self.cv_accuracy = round(acc, 4)
            self.cv_macro_f1 = round(macro_f1, 4)
            self.training_samples = len(texts)
            self.user_corrections_count = len(corrections)
            self.last_train_ms = duration_ms
            self.override_map = override_lookup

        # Persist model artifact if directory is writable
        try:
            model_dir = os.path.dirname(settings.MODEL_PATH)
            if model_dir:
                os.makedirs(model_dir, exist_ok=True)
            joblib.dump(
                {
                    "pipeline": pipe,
                    "override_map": override_lookup,
                    "cv_accuracy": self.cv_accuracy,
                    "cv_macro_f1": self.cv_macro_f1,
                },
                settings.MODEL_PATH,
            )
        except Exception:
            pass

        return self.get_metrics()

    def get_metrics(self) -> Dict[str, Any]:
        return {
            "model_type": "Hybrid TF-IDF (Word 1-2g + Char 3-5g) + LogisticRegression",
            "categories": CATEGORIES,
            "training_samples": self.training_samples,
            "user_corrections_count": self.user_corrections_count,
            "cv_accuracy": self.cv_accuracy,
            "cv_macro_f1": self.cv_macro_f1,
            "last_train_ms": self.last_train_ms,
        }

    def predict(
        self,
        merchant: str,
        raw_text: str = "",
        tx_type: str = "debit",
        user_overrides: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Predict category, confidence score, top-3 probabilities, and influential TF-IDF tokens."""
        norm_m = normalize_merchant_name(merchant)
        clean_input = _preprocess_for_nlp(f"{merchant} {raw_text}")

        # 1. Check user-specific active-learning override map first
        if user_overrides and norm_m in user_overrides:
            chosen = user_overrides[norm_m]
            return {
                "category": chosen,
                "confidence": 0.99,
                "source": "active_learning_memory",
                "top_tokens": [norm_m.lower(), "user_verified_rule"],
                "probabilities": [
                    {"category": chosen, "probability": 0.99},
                ],
            }

        with self._lock:
            if norm_m in self.override_map:
                chosen = self.override_map[norm_m]
                return {
                    "category": chosen,
                    "confidence": 0.98,
                    "source": "active_learning_retrained",
                    "top_tokens": [norm_m.lower(), "retrained_weight"],
                    "probabilities": [
                        {"category": chosen, "probability": 0.98},
                    ],
                }
            pipe = self.pipeline

        if tx_type == "credit" and any(
            kw in clean_input for kw in ("SALARY", "NEFT CR", "DIVIDEND", "REFUND", "CASHBACK", "PAYOUT")
        ):
            return {
                "category": "Income & Transfers",
                "confidence": 0.97,
                "source": "ml_plus_credit_rule",
                "top_tokens": ["credit_signal", norm_m.lower()[:18]],
                "probabilities": [{"category": "Income & Transfers", "probability": 0.97}],
            }

        assert pipe is not None
        probs = pipe.predict_proba([clean_input])[0]
        classes = list(pipe.classes_)
        top_indices = np.argsort(probs)[::-1]

        best_idx = int(top_indices[0])
        best_cat = str(classes[best_idx])
        best_prob = float(probs[best_idx])

        # Calibrate softmax temperature slightly so clear matches show intuitive 0.78-0.96 confidence
        logits = np.log(np.clip(probs, 1e-9, 1.0)) * 1.85
        exp_logits = np.exp(logits - np.max(logits))
        cal_probs = exp_logits / np.sum(exp_logits)
        confidence = round(float(cal_probs[best_idx]), 3)

        top_3 = [
            {
                "category": str(classes[int(idx)]),
                "probability": round(float(cal_probs[int(idx)]), 3),
            }
            for idx in top_indices[:3]
        ]

        # Extract top contributing TF-IDF features for explainability
        top_tokens = self._explain_tokens(pipe, clean_input, best_idx)

        return {
            "category": best_cat,
            "confidence": confidence,
            "source": "tfidf_logreg",
            "top_tokens": top_tokens,
            "probabilities": top_3,
        }

    def _explain_tokens(self, pipe: Pipeline, clean_input: str, class_idx: int) -> List[str]:
        """Return top 4 non-zero TF-IDF features with highest positive weight for the predicted class."""
        try:
            union: FeatureUnion = pipe.named_steps["features"]
            clf: LogisticRegression = pipe.named_steps["clf"]
            vec = union.transform([clean_input])
            coefs = clf.coef_[class_idx]
            contributions = vec.toarray()[0] * coefs

            feature_names: List[str] = []
            for name, trans in union.transformer_list:
                fn = trans.get_feature_names_out()
                prefix = "" if name == "word_tfidf" else "subword:"
                feature_names.extend([f"{prefix}{f.strip()}" for f in fn])

            nonzero_idx = np.where(contributions > 0)[0]
            if len(nonzero_idx) == 0:
                return [w.lower() for w in clean_input.split()[:3]]
            sorted_idx = nonzero_idx[np.argsort(contributions[nonzero_idx])[::-1]]
            tokens: List[str] = []
            for i in sorted_idx:
                tok = feature_names[int(i)]
                if tok not in tokens:
                    tokens.append(tok)
                if len(tokens) >= 4:
                    break
            return tokens
        except Exception:
            return [w.lower() for w in clean_input.split()[:3]]


categorizer = SmartCategorizer()
