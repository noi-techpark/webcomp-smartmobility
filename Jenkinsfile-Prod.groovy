pipeline {
    agent {
        dockerfile {
            filename 'docker/dockerfile-node'
            additionalBuildArgs '--build-arg JENKINS_USER_ID=`id -u jenkins` --build-arg JENKINS_GROUP_ID=`id -g jenkins`'
        }
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
                sshagent (credentials: ['jenkins_github_ssh_key']) {
                        sh 'git add dist'
                        sh 'git commit -m "new release"'
                        sh 'git push origin'
                }
            }
        }
    }
}
