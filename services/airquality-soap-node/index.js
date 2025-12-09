const express = require('express');
const soap = require('soap');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.raw({ type: () => true }));

const zones = {
  "Centre": 42,
  "Port": 78,
  "Université": 25,
  "Nord": 55,
  "Sud": 30,
  "Ouest": 65,
  "Est": 40
};

const service = {
  AirQualityService: {
    AirQualityPort: {
      getAQI: function(args) {
        const zone = args.zone;
        const aqi = zones[zone] || 999;
        return { aqi: aqi, status: aqi <= 50 ? "Bon" : aqi <= 100 ? "Modéré" : "Mauvais" };
      }
    }
  }
};

const xml = `<?xml version="1.0" encoding="utf-8"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/" 
             xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/" 
             xmlns:tns="http://smartcity.com/airquality" 
             targetNamespace="http://smartcity.com/airquality">
  <types>
    <xsd:schema targetNamespace="http://smartcity.com/airquality">
      <xsd:element name="getAQIRequest" type="tns:getAQIRequest"/>
      <xsd:complexType name="getAQIRequest">
        <xsd:sequence><xsd:element name="zone" type="xsd:string"/></xsd:sequence>
      </xsd:complexType>
      <xsd:element name="getAQIResponse" type="tns:getAQIResponse"/>
      <xsd:complexType name="getAQIResponse">
        <xsd:sequence>
          <xsd:element name="aqi" type="xsd:int"/>
          <xsd:element name="status" type="xsd:string"/>
        </xsd:sequence>
      </xsd:complexType>
    </xsd:schema>
  </types>
  <message name="getAQIRequest"><part name="parameters" element="tns:getAQIRequest"/></message>
  <message name="getAQIResponse"><part name="parameters" element="tns:getAQIResponse"/></message>
  <portType name="AirQualityPort">
    <operation name="getAQI">
      <input message="tns:getAQIRequest"/>
      <output message="tns:getAQIResponse"/>
    </operation>
  </portType>
  <binding name="AirQualityBinding" type="tns:AirQualityPort">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="getAQI">
      <soap:operation soapAction=""/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
  </binding>
  <service name="AirQualityService">
    <port name="AirQualityPort" binding="tns:AirQualityBinding">
      <soap:address location="http://localhost:3002/ws"/>
    </port>
  </service>
</definitions>`;

const server = soap.listen(app, '/ws', service, xml);

app.listen(3002, () => console.log('SOAP Node.js → http://localhost:3002/ws'));
