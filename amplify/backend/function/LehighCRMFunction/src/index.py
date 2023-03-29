from decimal import Decimal
from email import message
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from os import CLD_CONTINUED
import smtplib
import ssl
from flask_cors import CORS
from flask import Flask, jsonify, request
import awsgi
import boto3
from uuid import uuid4
from boto3.dynamodb.conditions import BeginsWith, Key
import urllib.parse
from bs4 import BeautifulSoup
from datetime import timedelta
import datetime
import re
import pdfkit
import requests
import simplejson as json
import random

aws_client = boto3.client('cognito-idp')
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table('LehighCRMTable-production')

# Constant variable with path prefix
BASE_ROUTE = "/items"

app = Flask(__name__)
CORS(app)

def customerSort(obj):
    return int(obj['CustomerData']['customerID'])

def jobSort(obj):
    return obj['JobData']['CreateDate']

def dashboardSort(obj):
    return obj['JobData']['JobInfo']['jobDate']

@app.route(BASE_ROUTE, methods=['GET'])
def list_customers():
    item = table.query(
        IndexName='GSI1',
        KeyConditionExpression='#SK = :value',

        ExpressionAttributeValues={
            ':value': 'profile'
        },
        ExpressionAttributeNames={
            '#SK': 'SK'
        }
    )

    data  = item['Items']
    while 'LastEvaluatedKey' in item:
        item = table.scan(ExclusiveStartKey=item['LastEvaluatedKey'])
        data.extend(item['Items'])
    
    for dia in data:
        if "DisableFlag" in dia and dia['DisableFlag'] == True:
            data.remove(dia)

    item['Items'] = data
    item['Items'].sort(key=customerSort, reverse=True)

    return jsonify(item)

@app.route(BASE_ROUTE + '/<PK>', methods=['GET'])
def get_customers(PK):
    PK = urllib.parse.unquote(PK)
    item = table.query(
        KeyConditionExpression='#PK = :value AND #SK = :val',
        ExpressionAttributeValues={
            ':value': PK,
            ':val': 'profile'
        },
        ExpressionAttributeNames={
            '#PK': 'PK',
            '#SK': 'SK'
        }
    )

    return jsonify(item)

@app.route(BASE_ROUTE + '/createCustomer', methods=['POST'])
def create_customer():
    request_json = request.get_json()

    table.put_item(Item={

        "PK": "customer#" + str(request_json['CustomerData']['customerID']),
        "SK": 'profile',
        "CustomerData": request_json['CustomerData'],
        "IS_TOUCHED": request_json['IS_TOUCHED']
    })

    table.put_item(Item={
        "PK": "__customernum",  # get from frontend
        "SK": "Constant",
        "CustomerID":int(request_json['CustomerData']['customerID']) + 1
    })

    return jsonify(message="item created")

@app.route(BASE_ROUTE + '/updateCustomer', methods=['PUT'])
def update_customer():
    request_json = request.get_json()
    PK = urllib.parse.unquote(request_json['PK'])

    table.update_item(
        Key={'PK': PK,

             'SK': 'profile'},
        UpdateExpression='SET #CustomerData = :CustomerData',
        ExpressionAttributeNames={
            '#CustomerData': 'CustomerData'
        },
        ExpressionAttributeValues={
            ":CustomerData": request_json['CustomerData']
        }
    )

    return jsonify(message="item updated")

@app.route(BASE_ROUTE + '/deleteCustomer', methods=['PUT'])
def delete_customer():

    request_json = request.get_json()
    PK = urllib.parse.unquote(request_json['PK'])
    table.update_item(
        # IndexName='GSI1',
        Key={'PK': PK,
             'SK': request_json['SK']},
        UpdateExpression='SET #CustomerData = :CustomerData, #DisableFlag = :DisableFlag',
        ExpressionAttributeNames={
            '#CustomerData': 'CustomerData',
            '#DisableFlag': 'DisableFlag',
        },
        ExpressionAttributeValues={
            ":CustomerData": json.loads(json.dumps(request_json["CustomerData"]), parse_float=Decimal),
            ":DisableFlag": True
        }
    )
    return jsonify(message="customer deleted")

@app.route(BASE_ROUTE + '/getcustomerid', methods=['GET'])
def get_customerid():

    item = table.query(
        KeyConditionExpression='#PK = :value',
        ExpressionAttributeValues={
            ':value': '__customernum'
        },
        ExpressionAttributeNames={
            '#PK': 'PK'
        }
    )

    customerID = item['Items'][0]['CustomerID']

    return jsonify(customerID)

@app.route(BASE_ROUTE + '/listJob', methods=['GET'])
def list_jobs():
    scan_kwargs = {
        'FilterExpression': Key('SK').begins_with('job')
    }
    item = table.scan(**scan_kwargs)  # lastEvaluationKey yet to add

    data  = item['Items']
    while 'LastEvaluatedKey' in item:
        item = table.scan(ExclusiveStartKey=item['LastEvaluatedKey'])
        data.extend(item['Items'])
    
    for dia in data:
        if "DisableFlag" in dia and dia['DisableFlag'] == True:
            data.remove(dia)
            
    item['Items'] = data
    item['Items'].sort(key=jobSort, reverse=True)

    return jsonify(item)

@app.route(BASE_ROUTE + '/getjob' + '/<SK>', methods=['GET'])
def get_jobs(SK):
    item = table.query(
        IndexName='GSI1',
        KeyConditionExpression='#SK = :value',
        ExpressionAttributeValues={
            ':value': SK
        },
        ExpressionAttributeNames={
            '#SK': 'SK'
        }
    )
    return jsonify(item)

@app.route(BASE_ROUTE + '/createJob', methods=['POST'])
def create_jobs():
    request_json = request.get_json()
    PK = urllib.parse.unquote(request_json["PK"])
    SK = "job" + str(uuid4())

    item = table.query(
        KeyConditionExpression='#PK = :value',
        ExpressionAttributeValues={
            ':value': '__jobnum'
        },
        ExpressionAttributeNames={
            '#PK': 'PK'
        }
    )
    
    jobID = item['Items'][0]['JobID']
    request_json['JobData']['JobID'] = jobID

    table.put_item(Item={
        "PK": PK,  # get from frontend
        "SK": SK,
        "JobData": json.loads(json.dumps(request_json["JobData"]), parse_float=Decimal),
    })

    table.put_item(Item={
        "PK": "__jobnum",  # get from frontend
        "SK": "Constant",
        "JobID": jobID + 1
    })

    obj = {
        "Status": "item created",
        "SK": SK
    }
    return jsonify(obj)

@app.route(BASE_ROUTE + '/job', methods=['PUT'])
def update_jobs():
    request_json = request.get_json()
    PK = urllib.parse.unquote(request_json['PK'])
    table.update_item(
        # IndexName='GSI1',
        Key={'PK': PK,
             'SK': request_json['SK']},
        UpdateExpression='SET #JobData = :JobData',
        ExpressionAttributeNames={
            '#JobData': 'JobData'
        },
        ExpressionAttributeValues={
            ":JobData": json.loads(json.dumps(request_json["JobData"]), parse_float=Decimal)
        }
    )
    return jsonify(message="item updated")

@app.route(BASE_ROUTE + '/deleteJob', methods=['PUT'])
def delete_job():
    request_json = request.get_json()
    PK = urllib.parse.unquote(request_json['PK'])
    table.update_item(
        # IndexName='GSI1',
        Key={'PK': PK,
             'SK': request_json['SK']},
        UpdateExpression='SET #JobData = :JobData, #DisableFlag = :DisableFlag',
        ExpressionAttributeNames={
            '#JobData': 'JobData',
            '#DisableFlag': 'DisableFlag',
        },
        ExpressionAttributeValues={
            ":JobData": json.loads(json.dumps(request_json["JobData"]), parse_float=Decimal),
            ":DisableFlag": True
        }
    )
    return jsonify(message="job deleted")

@app.route(BASE_ROUTE + '/archiveQuote', methods=['PUT'])
def archive_quote():
    request_json = request.get_json()
    PK = urllib.parse.unquote(request_json['PK'])
    table.update_item(
        # IndexName='GSI1',
        Key={'PK': PK,
             'SK': request_json['SK']},
        UpdateExpression='SET #JobData = :JobData, #ArchiveFlag = :ArchiveFlag',
        ExpressionAttributeNames={
            '#JobData': 'JobData',
            '#ArchiveFlag': 'ArchiveFlag'
        },
        ExpressionAttributeValues={
            ":JobData": json.loads(json.dumps(request_json["JobData"]), parse_float=Decimal),
            ":ArchiveFlag": True
        }
    )
    return jsonify(message="item archived")

@app.route(BASE_ROUTE + '/unarchiveQuote', methods=['PUT'])
def unarchive_quote():
    request_json = request.get_json()
    PK = urllib.parse.unquote(request_json['PK'])
    table.update_item(
        # IndexName='GSI1',
        Key={'PK': PK,
             'SK': request_json['SK']},
        UpdateExpression='SET #JobData = :JobData, #ArchiveFlag = :ArchiveFlag',
        ExpressionAttributeNames={
            '#JobData': 'JobData',
            '#ArchiveFlag': 'ArchiveFlag'
        },
        ExpressionAttributeValues={
            ":JobData": json.loads(json.dumps(request_json["JobData"]), parse_float=Decimal),
            ":ArchiveFlag": False
        }
    )
    return jsonify(message="item unarchived")

@app.route(BASE_ROUTE + '/listCustomerNames', methods=['GET'])
def list_customer_names():
    customerNames = set()
    item = table.query(
        IndexName='GSI1',
        KeyConditionExpression='#SK = :value',
        ExpressionAttributeValues={
            ':value': 'profile'
        },
        ExpressionAttributeNames={
            '#SK': 'SK'
        }
    )
    for customers in item['Items']:
        customerName = customers['CustomerData']['firstName'] + ' ' + customers['CustomerData']['lastName']
        customerNames.add(customerName)

    customerNames = list(customerNames)
    return jsonify(customerNames)

@app.route(BASE_ROUTE + '/listJobNames', methods=['GET'])
def list_job_names():
    jobNames = set()
    scan_kwargs = {
        'FilterExpression': Key('SK').begins_with('job')
    }
    item = table.scan(**scan_kwargs)  # lastEvaluationKey yet to add

    item['Items'].sort(key=jobSort, reverse=True)

    for job in item['Items']:
        name = job['JobData']['leadName']
        jobNames.add(name)
    jobNames = list(jobNames)
    return jsonify(jobNames)

@app.route(BASE_ROUTE + '/jobStatus', methods=['GET'])
def job_status():
    date = datetime.datetime.now()
    date = date - timedelta(days=7)
    date = str(date).split()[0]

    week_date = datetime.datetime.strptime(date, '%Y-%m-%d')

    jobs = {}
    completedJobs = []
    pendingJobs = []
    quoteJobs = []
    scan_kwargs = {
        'FilterExpression': Key('SK').begins_with('job')
    }
    item = table.scan(**scan_kwargs)  # lastEvaluationKey yet to add

    data  = item['Items']
    while 'LastEvaluatedKey' in item:
        item = table.scan(ExclusiveStartKey=item['LastEvaluatedKey'])
        data.extend(item['Items'])
    
    for dia in data:
        if "DisableFlag" in dia and dia['DisableFlag'] == True:
            data.remove(dia)
            
    item['Items'] = data



    for job in item['Items']:
        if (job['JobData']['paymentStatusType'] == 'UNPAID' or job['JobData']['paymentStatusType'] == 'PARTIALLY PAID') and job['JobData']['paymentStatus'] == 'Sales':
            pendingJobs.append(job)

        if job['JobData']['paymentStatusType'] == 'PAID' and job['JobData']['paymentStatus'] == 'Sales' and datetime.datetime.strptime(job['JobData']['JobInfo']['jobDate'], '%Y-%m-%d') >= week_date:
            completedJobs.append(job)
        
        if job['JobData']['paymentStatus'] == 'Quote' and ('ArchiveFlag' not in job or job['ArchiveFlag'] == False):
            quoteJobs.append(job)

    completedJobs.sort(key=dashboardSort, reverse=True)
    pendingJobs.sort(key=dashboardSort, reverse=False)
    quoteJobs.sort(key=dashboardSort, reverse=True)

    jobs['completedJobs'] = completedJobs
    jobs['pendingJobs'] = pendingJobs
    jobs['quoteJobs'] = quoteJobs

    return jsonify(jobs)

@app.route(BASE_ROUTE + '/getjobStatus', methods=['PUT'])
def get_job_status():
    request_json = request.get_json()

    date = datetime.datetime.now()
    date = date - timedelta(days=int(request_json['timedelta']))
    date = str(date).split()[0]

    week_date = datetime.datetime.strptime(date, '%Y-%m-%d')

    jobs = {}
    completedJobs = []
    
    scan_kwargs = {
        'FilterExpression': Key('SK').begins_with('job')
    }
    item = table.scan(**scan_kwargs)  # lastEvaluationKey yet to add

    data  = item['Items']
    while 'LastEvaluatedKey' in item:
        item = table.scan(ExclusiveStartKey=item['LastEvaluatedKey'])
        data.extend(item['Items'])
    
    for dia in data:
        if "DisableFlag" in dia and dia['DisableFlag'] == True:
            data.remove(dia)
            
    item['Items'] = data

    for job in item['Items']:  
        if job['JobData']['paymentStatusType'] == 'PAID' and job['JobData']['paymentStatus'] == 'Sales' and datetime.datetime.strptime(job['JobData']['JobInfo']['jobDate'], '%Y-%m-%d') >= week_date:
            completedJobs.append(job)
        
    completedJobs.sort(key=dashboardSort, reverse=True)
    jobs['completedJobs'] = completedJobs
    
    return jsonify(jobs)

@app.route(BASE_ROUTE + '/createEvent', methods=['POST'])
def create_event():
    request_json = request.get_json()
    request_json['EventData']['id'] = 'event' + str(uuid4())
    table.put_item(Item={
        "PK": request_json['EventData']['id'],
        "SK": "event",
        "EventData": request_json['EventData'],
        "IS_SENT": False
    })
    return jsonify("event created")

@app.route(BASE_ROUTE + '/readEvent' + '/<PK>', methods=['GET'])
def read_event(PK):
    item = table.query(
    IndexName='GSI1',
    KeyConditionExpression='#PK = :value',
    ExpressionAttributeValues={
        ':value': PK
    },
    ExpressionAttributeNames={
        '#PK': 'PK'
    }
    )
    return jsonify(item)

@app.route(BASE_ROUTE + '/updateEvent', methods=['PUT'])
def update_event():
    request_json = request.get_json()
    request_json['EventData']['id'] = request_json['PK']
    table.update_item(
        # IndexName='GSI1',
        Key={'PK': request_json['PK'],
             'SK': 'event'},
        UpdateExpression='SET #EventData = :EventData',
        ExpressionAttributeNames={
            '#EventData': 'EventData'
        },
        ExpressionAttributeValues={
            ":EventData": request_json["EventData"]
        }
    )
    return jsonify(message="event updated")

@app.route(BASE_ROUTE + '/listEvent', methods=['GET'])
def list_event():
    item = table.query(
        IndexName='GSI1',
        KeyConditionExpression='#SK = :value',

        ExpressionAttributeValues={
            ':value': 'event'
        },
        ExpressionAttributeNames={
            '#SK': 'SK'
        }
    ) # lastEvaluationKey yet to add

    return jsonify(item)

@app.route(BASE_ROUTE + '/deleteEvent', methods=['POST'])
def delete_event():
    request_json = request.get_json()
    table.delete_item(
    Key={
        'PK': request_json['PK'],
        'SK': 'event'
    }
    )
    return jsonify(message="event deleted")

@app.route(BASE_ROUTE + '/eventNotification', methods=['POST'])
def event_notification():
    falseEvent = []
    request_json = request.get_json()
    item = table.query(
        IndexName='GSI1',
        KeyConditionExpression='#SK = :value',

        ExpressionAttributeValues={
            ':value': 'event'
        },
        ExpressionAttributeNames={
            '#SK': 'SK'
        }
    )
    events = item['Items']
    for event in events:
        if event['EventData']['agent'] == request_json['agent'] and event['EventData']['checkForm'] == False:
            falseEvent.append(event)

            table.update_item(
                Key={'PK': event['PK'],
                    'SK': 'event'},
                UpdateExpression='SET #EventData = :EventData, #IS_SENT = :IS_SENT',
                ExpressionAttributeNames={
                    '#EventData': 'EventData',
                    '#IS_SENT': 'IS_SENT',
                },
                ExpressionAttributeValues={
                    ":EventData": event["EventData"],
                    ":IS_SENT": True
                }
            ) 

        if request_json['agent'] == 'admin':
            if event['EventData']['checkForm'] == True:
                falseEvent.append(event)
                
    return jsonify(falseEvent)

@app.route(BASE_ROUTE + '/listjobid', methods=['GET'])
def get_jobid():
    item = table.query(
        KeyConditionExpression='#PK = :value',
        ExpressionAttributeValues={
            ':value': '__jobnum'
        },
        ExpressionAttributeNames={
            '#PK': 'PK'
        }
    )
    return jsonify(item)

@app.route(BASE_ROUTE + '/generateinvoice', methods=['POST'])
def generate_invoice():
    request_json = request.get_json()

    sub_total = 0
    new_line_item = ''

    CustomerData = request_json['CustomerData']
    JobData = request_json['JobData']

    jobID = request_json['JobData']['JobID']

    if (JobData['JobForm']['paymentStatus'] == "Quote"):
        item = table.query(
            KeyConditionExpression='#PK = :val AND #SK = :value',
            ExpressionAttributeValues={
                ':val': '__quote',
                ':value': request_json['Agent']
            },
            ExpressionAttributeNames={
                '#PK': 'PK',
                '#SK': 'SK'
            }
        )
    else:
        item = table.query(
            KeyConditionExpression='#PK = :val AND #SK = :value',
            ExpressionAttributeValues={
                ':val': '__template',
                ':value': request_json['Agent']
            },
            ExpressionAttributeNames={
                '#PK': 'PK',
                '#SK': 'SK'
            }
        )

    temp = item['Items'][0]['template']
    soup = BeautifulSoup(temp, 'html.parser')

    abc = datetime.date.today()
    temp_date = abc.strftime("%B %d, %Y")
    date = str(temp_date)

    datediv = soup.find("p", {"id": "date"})
    datesecdiv = soup.find("p", {"id": "footer-date"})
    datediv.string = date
    datesecdiv.string = date

    namediv = soup.find("p", {"id": "name"})
    namediv.string = CustomerData['CustomerData']['firstName'] + ' ' + CustomerData['CustomerData']['lastName']

    addressdiv = soup.find("p", {"id": "address"})
    addressdiv.string = JobData['JobForm']['jobAddress']

    phonediv = soup.find("p", {"id": "phone"})
    phonediv.string = JobData['JobForm']['jobPhone']

    emaildiv = soup.find("p", {"id": "email"})
    emaildiv.string = CustomerData['CustomerData']['email']
    print(JobData['JobForm'])
    if JobData['JobForm']['lineItemNotes'] == "" or JobData['JobForm']['lineItemNotes'] == None:
        linesumheaddiv = soup.find("h5", {"id": "lineItemSumHead"})
        linesumheaddiv.decompose()

    else:
        linesumdiv = soup.find("p", {"id": "lineItemSum"})
        linesumdiv.string = JobData['JobForm']['lineItemNotes']

    i = 1
    trstr = '<tr><td class="text-center" style="border: 1px solid black;" id="len1"></td><td class="text-center" colspan="11" id="quantity1" style="border: 1px solid black;"></td><td style="border: 1px solid black;" id="line-item1"></td></tr>'
    tabdiv = soup.find("tbody", {"id": "table-id1"})
    
    
    for line in JobData['JobForm']['ProductPayment']:
        tbodysoup = BeautifulSoup(trstr, 'html.parser')

        lendiv = tbodysoup.find("td", {"id": "len1"})
        lindiv = tbodysoup.find("td", {"id": "line-item1"})
        quadiv = tbodysoup.find("td", {"id": "quantity1"})
        
        lendiv.string = str(i)
        lindiv.string = line['lineItem']
        quadiv.string = str(line['quantity'])

        tabdiv.append(tbodysoup)



        # lendiv = soup.find("td", {"id": "len"+str(i)})
        # lendiv.string = str(i)

        # lendiv = soup.find("td", {"id": "line-item"+str(i)})
        # lendiv.string = line['lineItem']

        # lendiv = soup.find("td", {"id": "quantity"+str(i)})
        # lendiv.string = str(line['quantity'])

        i = i + 1

    for pro in JobData['JobForm']['ProductPayment']:
        if type(pro['rate']) == str:
            sub_total += int(pro['rate']) * int(pro['quantity'])
        else:
            sub_total += pro['rate'] * pro['quantity']

    if type(JobData['JobForm']['markUp']) == str:
        valueInpercent = sub_total * (int(JobData['JobForm']['markUp'])/100)
    else:
        valueInpercent = sub_total * (JobData['JobForm']['markUp']/100)
    sub_total = sub_total + valueInpercent

    subtotaldiv = soup.find("td", {"id": "sub-total"})
    subtotaldiv.string = '$' + str(JobData['subTotal'])

    if JobData['discountType'] == True:
        discountdiv = soup.find("td", {"id": "discount"})
        if type(JobData['JobForm']['discount']) == str:
            discountdiv.string = JobData['JobForm']['discount'] + '%'
        else:
            discountdiv.string = str(JobData['JobForm']['discount']) + '%'

    else:
        discountdiv = soup.find("td", {"id": "discount"})
        if type(JobData['JobForm']['discount']) == str:
            discountdiv.string = '$' + JobData['JobForm']['discount']
        else:
            discountdiv.string = '$' + str(JobData['JobForm']['discount'])

    # labourdiv = soup.find("td", {"id": "labourcost"})
    # if type(JobData['JobForm']['discount']) == str:
    #     labourdiv.string = '$' + JobData['JobForm']['labourCost']
    # else:
    #     labourdiv.string = '$' + str(JobData['JobForm']['labourCost'])
    totaldiv = soup.find("td", {"id": "total"})
    
    baldiv = soup.find("td", {"id": "balance"})
    Amountdiv = soup.find("td", {"id": "AmountPaid"})

    if JobData['JobForm']['paymentStatusType'] == "PAID" and JobData['JobForm']['paymentStatus'] == "Sales":
        if type(JobData['Total']) == str:
            totaldiv.string = '$' + JobData['Total']
            Amountdiv.string = '$' + JobData['Total']
            baldiv.string = '$0'
        else:
            totaldiv.string = '$' + str(JobData['Total'])
            Amountdiv.string = '$' + str(JobData['Total'])
            baldiv.string = '$0'
    else:
        if type(JobData['Total']) == str:
            totaldiv.string = '$' + JobData['Total']
            baldiv.string = '$' + JobData['Total']
            Amountdiv.string = '$0'
        else:
            totaldiv.string = '$' + str(JobData['Total'])
            baldiv.string = '$' + str(JobData['Total'])
            Amountdiv.string = '$0'

    jobiddiv = soup.find("p", {"id": "job-id"})
    jobiddiv.string = 'PO # LH-' + JobData['JobID']

    obj = {
        "html": str(soup),
        "key": '_PO_' + str(jobID) + '.pdf'
    }

    r = requests.post('https://8usq5tz64h.execute-api.us-west-2.amazonaws.com/dev/new-pdf', json.dumps(obj))

    return jsonify(message="Done")

@app.route(BASE_ROUTE + '/listUser', methods=['GET'])
def list_user():
    response = aws_client.list_users(
        UserPoolId='us-west-2_o7lTRUqnd'
    )

    return jsonify(response)

@app.route(BASE_ROUTE + '/getGroupForUser', methods=['POST'])
def get_group_for_user():
    request_json = request.get_json()

    response = aws_client.admin_list_groups_for_user(
        Username=request_json['email'],
        UserPoolId='us-west-2_o7lTRUqnd'
    )

    return jsonify(response['Groups'][0]['GroupName'])

@app.route(BASE_ROUTE + '/addUserToGroup', methods=['POST'])
def add_user_to_group():
    request_json = request.get_json()
    print(request_json)
    
    response = aws_client.admin_add_user_to_group(
        UserPoolId='us-west-2_o7lTRUqnd',
        Username=request_json['email'],
        GroupName=request_json['role'].lower()
    )

    return jsonify("User added to group")

@app.route(BASE_ROUTE + '/enableUser', methods=['PUT'])
def enable_user():
    request_json = request.get_json()

    response = aws_client.admin_enable_user(
        UserPoolId='us-west-2_o7lTRUqnd',
        Username=request_json['email']
    )

    if request_json['role'] == 'user':
        item = table.query(
            IndexName='GSI1',
            KeyConditionExpression='#SK = :value',

            ExpressionAttributeValues={
                ':value': 'technician'
            },
            ExpressionAttributeNames={
                '#SK': 'SK'
            }
        )

        for tech in item['Items']:
            if request_json['name'] == tech['Name']:
                table.update_item(
                    Key={'PK': tech['PK'],
                        'SK': tech['SK']},
                    UpdateExpression='SET #Name = :Name, #color = :color, #isActive = :isActive',
                    ExpressionAttributeNames={
                        '#Name': 'Name',
                        '#color': 'color',
                        '#isActive': 'isActive',
                    },
                    ExpressionAttributeValues={
                        ":Name": tech["Name"],
                        ":color": tech["color"],
                        ":isActive": True,

                    }
                )

    return jsonify("User enabled")

@app.route(BASE_ROUTE + '/disableUser', methods=['PUT'])
def disable_user():
    request_json = request.get_json()

    response = aws_client.admin_disable_user(
        UserPoolId='us-west-2_o7lTRUqnd',
        Username=request_json['email']
    )

    if request_json['role'] == 'user':
        item = table.query(
            IndexName='GSI1',
            KeyConditionExpression='#SK = :value',

            ExpressionAttributeValues={
                ':value': 'technician'
            },
            ExpressionAttributeNames={
                '#SK': 'SK'
            }
        )

        for tech in item['Items']:
            if request_json['name'] == tech['Name']:
                table.update_item(
                    Key={'PK': tech['PK'],
                        'SK': tech['SK']},
                    UpdateExpression='SET #Name = :Name, #color = :color, #isActive = :isActive',
                    ExpressionAttributeNames={
                        '#Name': 'Name',
                        '#color': 'color',
                        '#isActive': 'isActive',
                    },
                    ExpressionAttributeValues={
                        ":Name": tech["Name"],
                        ":color": tech["color"],
                        ":isActive": False,

                    }
                )

    return jsonify("User disabled")

@app.route(BASE_ROUTE + '/createUser', methods=['POST'])
def create_user():
    r = lambda: random.randint(0,255)
    color = '#%02X%02X%02X' % (r(),r(),r())

    request_json = request.get_json()

    response = aws_client.admin_create_user(
        UserPoolId = 'us-west-2_o7lTRUqnd',
        Username = request_json['email'], 
        UserAttributes = [
            {"Name": "name", "Value": request_json['firstName'] + ' ' + request_json['lastName']},
            {"Name": "email", "Value": request_json['email']},
            { "Name": "email_verified", "Value": "true" },
            { "Name": "picture", "Value": request_json['picture']},
            { "Name": "phone_number", "Value": request_json['phone']},
        ],
        TemporaryPassword=request_json['tempPass'],
        DesiredDeliveryMediums = ['EMAIL']
    )

    if request_json['role'] == 'user':
        table.put_item(Item={

            "PK": "technician#" + str(uuid4()),
            "SK": 'technician',
            "Name": request_json['firstName'] + ' ' + request_json['lastName'],
            "color": {
                "primary": color,
                "secondary": color
            }
        })

    return jsonify("User created")

@app.route(BASE_ROUTE + '/updateUser', methods=['PUT'])
def update_user():
    request_json = request.get_json()
    
    response = aws_client.admin_update_user_attributes(
    UserPoolId = 'us-west-2_o7lTRUqnd',
    Username = request_json['email'], 
    UserAttributes = [
        {"Name": "name", "Value": request_json['firstName'] + ' ' + request_json['lastName']},
        {"Name": "email", "Value": request_json['email']},
        { "Name": "email_verified", "Value": "true" },
        { "Name": "picture", "Value": request_json['picture']},
        { "Name": "phone_number", "Value": request_json['phone']},
    ])

    return jsonify("User updated")

@app.route(BASE_ROUTE + '/setUserPassword', methods=['PUT'])
def set_user_pass():
    request_json = request.get_json()

    response = aws_client.admin_set_user_password(
        UserPoolId='us-west-2_o7lTRUqnd',
        Username=request_json['email'],
        Password=request_json['tempPass'],
        Permanent=True
    )

    return jsonify("Password changed")

@app.route(BASE_ROUTE + '/listCompanies', methods=['GET'])
def list_companies():
    item = table.query(
        IndexName='GSI1',
        KeyConditionExpression='#SK = :value',

        ExpressionAttributeValues={
            ':value': 'company'
        },
        ExpressionAttributeNames={
            '#SK': 'SK'
        }
    )

    return jsonify(item)

@app.route(BASE_ROUTE + '/createCompany', methods=['POST'])
def create_company():
    request_json = request.get_json()

    table.put_item(Item={

        "PK": "company#" + str(uuid4()),
        "SK": 'company',
        "CompanyName": request_json['CompanyName'],
        "isActive": True,
        "CreateDate": str(datetime.datetime.now())
    })

    return jsonify("Company created")

@app.route(BASE_ROUTE + '/updateCompany', methods=['PUT'])
def update_company():
    request_json = request.get_json()
    PK = urllib.parse.unquote(request_json['PK'])

    table.update_item(
        Key={'PK': PK,

             'SK': 'company'},
        UpdateExpression='SET #CompanyName = :CompanyName, #isActive = :isActive, #CreateDate = :CreateDate',
        ExpressionAttributeNames={
            '#CompanyName': 'CompanyName',
            '#isActive': 'isActive',
            '#CreateDate': 'CreateDate',
        },
        ExpressionAttributeValues={
            ":CompanyName": request_json['CompanyName'],
            ":isActive": request_json['isActive'],
            ":CreateDate": request_json['CreateDate'],
        }
    )

    return jsonify("company updated")

@app.route(BASE_ROUTE + '/listSalesType', methods=['GET'])
def list_sale_type():
    item = table.query(
        IndexName='GSI1',
        KeyConditionExpression='#SK = :value',

        ExpressionAttributeValues={
            ':value': 'salestype'
        },
        ExpressionAttributeNames={
            '#SK': 'SK'
        }
    )

    return jsonify(item)

@app.route(BASE_ROUTE + '/createSalesType', methods=['POST'])
def create_sales_type():
    request_json = request.get_json()

    table.put_item(Item={

        "PK": "salestype#" + str(uuid4()),
        "SK": 'salestype',
        "SalesTypeName": request_json['SalesTypeName'],
        "isActive": True,
        "CreateDate": str(datetime.datetime.now())
    })

    return jsonify("Sales Type created")

@app.route(BASE_ROUTE + '/updateSalesType', methods=['PUT'])
def update_sales_type():
    request_json = request.get_json()
    PK = urllib.parse.unquote(request_json['PK'])

    table.update_item(
        Key={'PK': PK,

             'SK': 'salestype'},
        UpdateExpression='SET #SalesTypeName = :SalesTypeName, #isActive = :isActive, #CreateDate = :CreateDate',
        ExpressionAttributeNames={
            '#SalesTypeName': 'SalesTypeName',
            '#isActive': 'isActive',
            '#CreateDate': 'CreateDate',
        },
        ExpressionAttributeValues={
            ":SalesTypeName": request_json['SalesTypeName'],
            ":isActive": request_json['isActive'],
            ":CreateDate": request_json['CreateDate'],
        }
    )

    return jsonify("Sales Type updated")

@app.route(BASE_ROUTE + '/listRecordPayment', methods=['GET'])
def list_record_payment():
    item = table.query(
        IndexName='GSI1',
        KeyConditionExpression='#SK = :value',

        ExpressionAttributeValues={
            ':value': 'recordpayment'
        },
        ExpressionAttributeNames={
            '#SK': 'SK'
        }
    )

    return jsonify(item)

@app.route(BASE_ROUTE + '/createRecordPayment', methods=['POST'])
def create_record_payment():
    request_json = request.get_json()

    table.put_item(Item={

        "PK": "recordpayment#" + str(uuid4()),
        "SK": 'recordpayment',
        "RecordPaymentName": request_json['RecordPaymentName'],
        "isActive": True,
        "CreateDate": str(datetime.datetime.now())
    })

    return jsonify("Record Payment created")

@app.route(BASE_ROUTE + '/updateRecordPayment', methods=['PUT'])
def update_record_payment():
    request_json = request.get_json()
    PK = urllib.parse.unquote(request_json['PK'])

    table.update_item(
        Key={'PK': PK,

             'SK': 'recordpayment'},
        UpdateExpression='SET #RecordPaymentName = :RecordPaymentName, #isActive = :isActive, #CreateDate = :CreateDate',
        ExpressionAttributeNames={
            '#RecordPaymentName': 'RecordPaymentName',
            '#isActive': 'isActive',
            '#CreateDate': 'CreateDate',
        },
        ExpressionAttributeValues={
            ":RecordPaymentName": request_json['RecordPaymentName'],
            ":isActive": request_json['isActive'],
            ":CreateDate": request_json['CreateDate'],
        }
    )

    return jsonify("Record Payment updated")

@app.route(BASE_ROUTE + '/trackInvoice', methods=['POST'])
def track_invoice():

    url = "https://eps.transactiongateway.com/api/query.php"

    params = {
        'report_type': 'invoicing',
        'security_key' : '9Qy8D756yZ7dNSEAkMqkHF76NVa6JBdP',
        'invoice_id' : ""
    }

    response = requests.post(url, params=params)
    soup = BeautifulSoup(response.content.decode(), 'html.parser')
    status = soup.find("status").string

    return jsonify(status)

@app.route(BASE_ROUTE + '/addChequeInfo', methods=['PUT'])
def add_cheque_info():
    request_json = request.get_json()

    item = table.query(
        IndexName='GSI1',
        KeyConditionExpression='#SK = :value',
        ExpressionAttributeValues={
            ':value': request_json['jobSK']
        },
        ExpressionAttributeNames={
            '#SK': 'SK'
        }
    )

    job = item['Items'][0]
    job['JobData']['paymentChequeAmount'] = request_json['paymentChequeAmount']
    job['JobData']['paymentChequeNumber'] = request_json['paymentChequeNumber']
    job['JobData']['paymentFirstName'] = request_json['paymentFirstName']
    job['JobData']['paymentLastName'] = request_json['paymentLastName']
    job['JobData']['paymentType'] = "Cheque"
    job['JobData']['paymentStatus'] = "Sales"
    job['JobData']['paymentAmount'] = request_json['paymentAmount']
    job['JobData']['paymentAmountLeft'] = request_json['paymentAmountLeft']
    
    if request_json['paymentStatusType'] == "Paid":
        job['JobData']['paymentStatusType'] = "PAID"

    elif request_json['paymentStatusType'] == "Unpaid":
        job['JobData']['paymentStatusType'] = "UNPAID"

    elif request_json['paymentStatusType'] == "Partially Paid":
        job['JobData']['paymentStatusType'] = "PARTIALLY PAID"

    table.update_item(
        # IndexName='GSI1',
        Key={'PK': job['PK'],
             'SK': job['SK']},
        UpdateExpression='SET #JobData = :JobData',
        ExpressionAttributeNames={
            '#JobData': 'JobData'
        },
        ExpressionAttributeValues={
            ":JobData": json.loads(json.dumps(job["JobData"]), parse_float=Decimal)
        }
    )

    return jsonify("Cheque Info Added")

@app.route(BASE_ROUTE + '/addCardInfo', methods=['PUT'])
def add_card_info():
    request_json = request.get_json()
    item = table.query(
        IndexName='GSI1',
        KeyConditionExpression='#SK = :value',
        ExpressionAttributeValues={
            ':value': request_json['jobSK']
        },
        ExpressionAttributeNames={
            '#SK': 'SK'
        }
    )

    job = item['Items'][0]
    job['JobData']['paymentFirstName'] = request_json['paymentFirstName']
    job['JobData']['paymentLastName'] = request_json['paymentLastName']
    job['JobData']['paymentType'] = "Credit Card"
    job['JobData']['paymentStatus'] = "Sales"
    job['JobData']['paymentAmount'] = request_json['paymentAmount']
    job['JobData']['paymentAmountLeft'] = request_json['paymentAmountLeft']

    if request_json['paymentStatusType'] == "Paid":
        job['JobData']['paymentStatusType'] = "PAID"

    elif request_json['paymentStatusType'] == "Unpaid":
        job['JobData']['paymentStatusType'] = "UNPAID"

    elif request_json['paymentStatusType'] == "Partially Paid":
        job['JobData']['paymentStatusType'] = "PARTIALLY PAID"

    table.update_item(
        # IndexName='GSI1',
        Key={'PK': job['PK'],
                'SK': job['SK']},
        UpdateExpression='SET #JobData = :JobData',
        ExpressionAttributeNames={
            '#JobData': 'JobData'
        },
        ExpressionAttributeValues={
            ":JobData": json.loads(json.dumps(job["JobData"]), parse_float=Decimal)
        }
    )

    return jsonify("Cheque Info Added")

@app.route(BASE_ROUTE + '/addCashInfo', methods=['PUT'])
def add_cash_info():
    request_json = request.get_json()

    item = table.query(
        IndexName='GSI1',
        KeyConditionExpression='#SK = :value',
        ExpressionAttributeValues={
            ':value': request_json['jobSK']
        },
        ExpressionAttributeNames={
            '#SK': 'SK'
        }
    )

    job = item['Items'][0]

    job['JobData']['paymentType'] = "Cash"
    job['JobData']['paymentStatus'] = "Sales"
    job['JobData']['paymentAmount'] = request_json['paymentAmount']
    job['JobData']['paymentAmountLeft'] = request_json['paymentAmountLeft']

    if request_json['paymentStatusType'] == "Paid":
        job['JobData']['paymentStatusType'] = "PAID"

    elif request_json['paymentStatusType'] == "Unpaid":
        job['JobData']['paymentStatusType'] = "UNPAID"

    elif request_json['paymentStatusType'] == "Partially Paid":
        job['JobData']['paymentStatusType'] = "PARTIALLY PAID"

    table.update_item(
        # IndexName='GSI1',
        Key={'PK': job['PK'],
             'SK': job['SK']},
        UpdateExpression='SET #JobData = :JobData',
        ExpressionAttributeNames={
            '#JobData': 'JobData'
        },
        ExpressionAttributeValues={
            ":JobData": json.loads(json.dumps(job["JobData"]), parse_float=Decimal)
        }
    )

    return jsonify("Cash Info Added")

@app.route(BASE_ROUTE + '/listTechnician', methods=['GET'])
def list_technician():
    item = table.query(
        IndexName='GSI1',
        KeyConditionExpression='#SK = :value',

        ExpressionAttributeValues={
            ':value': 'technician'
        },
        ExpressionAttributeNames={
            '#SK': 'SK'
        }
    )

    return jsonify(item)

@app.route(BASE_ROUTE + '/sendemail', methods=['POST'])
def send_email():
    request_json = request.get_json()
    
    # Set sender email and password for sending mail
    sender_email = "lehighhvac.trigger@stampasolutions.support"
    password = "Cu7t.UZ;61yt"

    # Create MIMEMultipart object        
    S2msg = MIMEMultipart("alternative")

    # Set Sender Mail Name        
    # S2msg["From"] = formataddr((str(Header('Pizza Hut Report', 'utf-8')), sender_email))
    msg = MIMEMultipart("alternative")
    msg["From"] = formataddr((str(Header('Lehigh CRM Support', 'utf-8')), sender_email))
    msg['Subject'] = request_json['subject']
    part = MIMEText(request_json['message'], "html")
    msg.attach(part)
    contxt = ssl.create_default_context()

    with smtplib.SMTP_SSL("mail.stampasolutions.support", 465, context=contxt) as server:
        server.login(sender_email, password)
        array = request_json['email']
        abc = server.sendmail(sender_email, array, msg.as_string())
        # print(active['StoreNum'])            
        print("Successfully sent the mail.")
    return jsonify("Email Sent")

@app.route(BASE_ROUTE + '/websiteAppointment', methods=['POST'])
def website_appointment():
    dynamodb = boto3.resource("dynamodb")
    websiteTable = dynamodb.Table('LehighHVACCalendar')

    request_json = request.get_json()
    print(request_json)
    request_json['EventData']['id'] = 'event' + str(uuid4())
    websiteTable.put_item(Item={
        "PK": request_json['EventData']['id'],
        "SK": "event",
        "EventData": request_json['EventData'],
    })
    return jsonify("event created")

@app.route(BASE_ROUTE + '/listwebsiteAppointment', methods=['GET'])
def list_website_appointment():
    dynamodb = boto3.resource("dynamodb")
    websiteTable = dynamodb.Table('LehighHVACCalendar')

    item = websiteTable.query(
        IndexName='GSI1',
        KeyConditionExpression='#SK = :value',

        ExpressionAttributeValues={
            ':value': 'event'
        },
        ExpressionAttributeNames={
            '#SK': 'SK'
        }
    ) # lastEvaluationKey yet to add

    return jsonify(item)

def handler(event, context):
    return awsgi.response(app, event, context)

