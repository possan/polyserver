FROM    centos:centos6
RUN     rpm -Uvh http://download.fedoraproject.org/pub/epel/6/i386/epel-release-6-8.noarch.rpm
RUN     yum install -y -q npm git

ADD package.json /src/
RUN cd /src; npm install
ADD *.js /src/

EXPOSE  3000
CMD ["node", "/src/app.js"]
