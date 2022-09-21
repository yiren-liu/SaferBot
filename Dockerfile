# Use nvidia/cuda image
FROM nvidia/cuda:11.0.3-base-ubuntu18.04

# set bash as current shell
RUN chsh -s /bin/bash
SHELL ["/bin/bash", "-c"]

# install anaconda
RUN apt-get update
# RUN apt-get install -y wget bzip2 ca-certificates git libglib2.0-0 libxext6 libsm6 libxrender1 mercurial subversion && \
RUN apt-get install -y wget bzip2 ca-certificates git python3.7-dev libmysqlclient-dev libpq-dev gcc && \
        apt-get clean
RUN wget --quiet "https://repo.anaconda.com/archive/Anaconda3-2022.05-Linux-x86_64.sh" -O ~/anaconda.sh && \
        /bin/bash ~/anaconda.sh -b -p /opt/conda && \
        rm ~/anaconda.sh && \
        ln -s /opt/conda/etc/profile.d/conda.sh /etc/profile.d/conda.sh && \
        echo ". /opt/conda/etc/profile.d/conda.sh" >> ~/.bashrc && \
        find /opt/conda/ -follow -type f -name '*.a' -delete && \
        find /opt/conda/ -follow -type f -name '*.js.map' -delete && \
        /opt/conda/bin/conda clean -afy

# set path to conda
ENV PATH /opt/conda/bin:$PATH


# setup conda virtual environment
COPY ./requirements.yaml /tmp/requirements.yaml
RUN conda update conda \
    && conda env create --name coroots -f /tmp/requirements.yaml

RUN echo "conda activate coroots" >> ~/.bashrc
ENV PATH /opt/conda/envs/coroots/bin:$PATH
ENV CONDA_DEFAULT_ENV $coroots

# run the django app
WORKDIR /code
COPY . /code/
# RUN python manage.py runserver 
# EXPOSE 8000