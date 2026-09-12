FROM python:3.10
ENV PYTHONUNBUFFERED=1
RUN mkdir /backend
WORKDIR /backend
ADD requirements.txt /backend/
RUN apt-get update \
    && apt-get install -y cron \
    && rm -rf /var/lib/apt/lists/*
RUN pip install -r requirements.txt
ADD . /backend/