#include <stdio.h>
#include <sys/types.h>
#include <termios.h>
#include <fcntl.h>
#include <stdlib.h>
#include <sys/ioctl.h>

#define MAX_BYTES_TO_READ	50
#define SERIAL_DEVICE	"/dev/ttyS0"

int main()
{
	struct termios serial_port_settings;
	int fd;
	int retval;
	char buf[256];
	int bytes_available;
	int i;

	fd = open(SERIAL_DEVICE, O_RDWR);
	if (fd < 0) {
		perror("Failed to open SERIAL_DEVICE");
		exit(1);
	}
	
	retval = tcgetattr(fd, &serial_port_settings);
	if (retval < 0) {
		perror("Failed to get termios structure");
		exit(2);
	}

	printf("Bytes available in the input buffer before flush:%d\n",
			bytes_available);
	tcflush(fd, TCIFLUSH);
	retval = ioctl(fd, FIONREAD, &bytes_available);
	if (retval < 0) {
		perror("FIONREAD ioctl failed\n");
		exit(7);
	}
	printf("Bytes available in the input buffer after flush:%d\n",
			bytes_available);
	close(fd);
	return 0;
}