pipeline {
    agent {
        dockerfile {
            filename 'infrastructure/docker/dockerfile-node'
            additionalBuildArgs '--build-arg JENKINS_USER_ID=`id -u jenkins` --build-arg JENKINS_GROUP_ID=`id -g jenkins`'
        }
    }

    options {
        ansiColor('xterm')
    }

    stages {
        stage('Dependencies') {
            steps {
                sh 'yarn install'
            }
        }
        /*TODO add test phase as soon as code also gets tested
        stage('Test') {
            steps {
                sh 'yarn test'
            }
        }
        */
        stage('Build') {
            steps {
                sh 'yarn build'
            }
        }
    }
}
