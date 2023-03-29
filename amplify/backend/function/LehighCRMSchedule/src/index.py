from decimal import Decimal
import json
import requests
from bs4 import BeautifulSoup
import boto3
from boto3.dynamodb.conditions import BeginsWith, Key

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table('LehighCRMTable-production')

def handler(event, context):
    jobs = []

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
        if job['JobData']['paymentStatusType'] == 'UNPAID' and job['JobData']['paymentStatus'] == 'Sales':
            jobs.append(job)
        elif job['JobData']['paymentStatusType'] == 'PARTIALLY PAID' and job['JobData']['paymentStatus'] == 'Sales':
            jobs.append(job)
    
    for jb in jobs:
        if 'paymentInvoiceID' in jb['JobData'] and (jb['JobData']['paymentInvoiceID'] != '' and jb['JobData']['paymentInvoiceID'] != None):

            url = "https://eps.transactiongateway.com/api/query.php"

            params = {
                'report_type': 'invoicing',
                'security_key' : '9Qy8D756yZ7dNSEAkMqkHF76NVa6JBdP',
                'invoice_id' : jb['JobData']['paymentInvoiceID']
            }

            response = requests.post(url, params=params)
            soup = BeautifulSoup(response.content.decode(), 'html.parser')
            status = soup.find("status").string

            if status == 'paid':
                jb['JobData']["paymentStatusType"] = "PAID"
                table.update_item(
                    # IndexName='GSI1',
                    Key={'PK': jb['PK'],
                        'SK': jb['SK']},
                    UpdateExpression='SET #JobData = :JobData',
                    ExpressionAttributeNames={
                        '#JobData': 'JobData'
                    },
                    ExpressionAttributeValues={
                        ":JobData": jb["JobData"]
                    }
                )

  
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        'body': json.dumps('Completed')
    }