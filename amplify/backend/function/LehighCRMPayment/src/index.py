from flask_cors import CORS
from flask import Flask, jsonify, request
import awsgi
import requests
import urllib.parse
import urllib
from io import BytesIO

BASE_ROUTE = "/items"

app = Flask(__name__)
CORS(app)

obj = {
        "Status": "",
        "TransactionID": ""
    }

class gwapi():

    def __init__(self):
        self.login= dict()
        self.billing = dict()
        self.responses = dict()

    def setLogin(self,security_key):
        self.login['security_key'] = security_key

    def setBilling(self, firstname, lastname):
        self.billing['firstname'] = firstname
        self.billing['lastname']  = lastname
    
    def doSale(self,amount, ccnumber, ccexp, cvv=''):
        query  = ""
        # Login Information

        query = query + "security_key=" + urllib.parse.quote(self.login['security_key']) + "&"
        # Sales Information
        query += "ccnumber=" + urllib.parse.quote(ccnumber) + "&"
        query += "ccexp=" + urllib.parse.quote(ccexp) + "&"
        query += "amount=" + urllib.parse.quote('{0:.2f}'.format(float(amount))) + "&"
        if (cvv!=''):
            query += "cvv=" + urllib.parse.quote(cvv) + "&"
        # Order Information
        # for key,value in self.order.items():
        #     query += key +"=" + urllib.parse.quote(str(value)) + "&"

        # Billing Information
        for key,value in self.billing.items():
            query += key +"=" + urllib.parse.quote(str(value)) + "&"

        # Shipping Information
        # for key,value in self.shipping.items():
        #     query += key +"=" + urllib.parse.quote(str(value)) + "&"

        query += "type=sale"
        return self.doPost(query)

    def doPost(self,query):
        responseIO = BytesIO()
        url = 'https://eps.transactiongateway.com/api/transact.php?' + query
        
        response = requests.post(url)

        self.responses['response'] = response.content.decode()
        responseArr = response.content.decode().split("&")

        for data in responseArr:
            if "transactionid" in data:
                TransactionID = data.split("=")[1]

    
        obj['TransactionID'] = TransactionID

        return response.content.decode()

@app.route(BASE_ROUTE + '/sendInvoice', methods=['POST'])
def send_invoice():
    request_json = request.get_json()

    obj = {
        "Status": "",
        "InvoiceID": ""
    }

    url = 'https://eps.transactiongateway.com/api/transact.php'

    params = {
        'invoicing': 'add_invoice',
        'security_key' : '9Qy8D756yZ7dNSEAkMqkHF76NVa6JBdP',
        'amount' : request_json['amount'],
        'email': request_json['email'],
        'firstname': request_json['firstname'],
        'lastname': request_json['lastname']
    }

    response = requests.post(url, params=params)
    responseArr = response.content.decode().split("&")
    print(response)
    print(responseArr)

    for data in responseArr:
        if "invoice_id" in data:
            InvoiceID = data.split("=")[1]
            obj['InvoiceID'] = InvoiceID


    if "response=1" in response.content.decode():
        obj['Status'] = "Approved"
        return jsonify(obj)
    elif "response=2" in response.content.decode():
        obj['Status'] = "Declined"
        return jsonify(obj)
    elif "response=3" in response.content.decode():
        obj['Status'] = "Error"
        return jsonify(obj)

@app.route(BASE_ROUTE + '/cardPayment', methods=['POST'])
def card_payment():
    request_json = request.get_json()

    gw = gwapi()
    gw.setLogin("9Qy8D756yZ7dNSEAkMqkHF76NVa6JBdP")

    gw.setBilling(request_json['firstName'],request_json['lastName'])
    # gw.setBilling("Ahad","Butt", "ahad.butt@stampsolutions.com")

    r = gw.doSale(request_json['amount'],request_json['ccnumber'],request_json['ccexp'],request_json['cvv'])
    # r = gw.doSale("1.00","4111111111111111","1025",'999')

    if "response=1" in gw.responses['response']:
        obj['Status'] = "Approved"
        return jsonify(obj)
    elif "response=2" in gw.responses['response'] :
        obj['Status'] = "Declined"
        return jsonify(obj)
    elif "response=3" in gw.responses['response'] :
        obj['Status'] = "Error"
        return jsonify(obj)

def handler(event, context):
    return awsgi.response(app, event, context)

